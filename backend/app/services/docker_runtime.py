import copy
import random
import re
import socket
import subprocess
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

import yaml

from ..core.config import (
    CHALLENGE_DOCKER_CONTEXT,
    CHALLENGE_DOCKER_ROOT,
    CHALLENGE_INSTANCE_PORT_MAX,
    CHALLENGE_INSTANCE_PORT_MIN,
)

COMPOSE_FILENAME = "docker-compose.yml"
_SAFE_TEMPLATE_ID_RE = re.compile(r"^[a-zA-Z0-9_.-]+$")
_SAFE_IMAGE_TOKEN_RE = re.compile(r"[^a-z0-9_.-]+")


def _is_safe_template_id(template_id: str) -> bool:
    return bool(_SAFE_TEMPLATE_ID_RE.fullmatch(template_id))


def _docker_root() -> Path:
    return Path(CHALLENGE_DOCKER_ROOT).resolve()


def _docker_base_command() -> list[str]:
    command = ["docker"]
    if CHALLENGE_DOCKER_CONTEXT:
        command.extend(["--context", CHALLENGE_DOCKER_CONTEXT])
    return command


def _compose_path_from_template_id(template_id: str) -> Path:
    if not _is_safe_template_id(template_id):
        raise ValueError("Invalid docker template id")

    root = _docker_root()
    candidate = (root / template_id).resolve()
    if candidate.parent != root:
        raise ValueError("Invalid docker template id")
    return candidate / COMPOSE_FILENAME


def _load_compose_doc(compose_path: Path) -> dict[str, Any]:
    if not compose_path.exists():
        raise FileNotFoundError("docker-compose.yml not found")

    with compose_path.open("r", encoding="utf-8") as fp:
        data = yaml.safe_load(fp) or {}

    if not isinstance(data, dict):
        raise ValueError("Invalid compose format")

    services = data.get("services")
    if not isinstance(services, dict) or not services:
        raise ValueError("Compose services section is missing")
    return data


def _parse_port_value(raw: Any) -> Optional[int]:
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str):
        stripped = raw.strip().strip('"').strip("'")
        stripped = stripped.split("/")[0]
        parts = [part.strip() for part in stripped.split(":") if part.strip()]
        if not parts:
            return None
        tail = parts[-1]
        if tail.isdigit():
            return int(tail)
        return None
    if isinstance(raw, dict):
        target = raw.get("target")
        if isinstance(target, int):
            return target
        if isinstance(target, str) and target.isdigit():
            return int(target)
    return None


def _extract_container_port(service_cfg: dict[str, Any]) -> Optional[int]:
    ports = service_cfg.get("ports")
    if isinstance(ports, list):
        for item in ports:
            parsed = _parse_port_value(item)
            if parsed:
                return parsed

    expose = service_cfg.get("expose")
    if isinstance(expose, list):
        for item in expose:
            parsed = _parse_port_value(item)
            if parsed:
                return parsed
    return None


def _compose_metadata(template_id: str, compose_doc: dict[str, Any], compose_path: Path) -> dict[str, Any]:
    services = compose_doc["services"]
    service_names: list[str] = []
    default_service: Optional[str] = None
    default_container_port: Optional[int] = None

    for service_name, service_cfg in services.items():
        if not isinstance(service_name, str) or not isinstance(service_cfg, dict):
            continue
        service_names.append(service_name)
        port = _extract_container_port(service_cfg)
        if default_service is None:
            default_service = service_name
        if port is not None and default_container_port is None:
            default_service = service_name
            default_container_port = port

    return {
        "template_id": template_id,
        "compose_path": compose_path,
        "services": service_names,
        "default_service": default_service,
        "default_container_port": default_container_port,
    }


def list_docker_templates() -> list[dict[str, Any]]:
    root = _docker_root()
    if not root.exists() or not root.is_dir():
        return []

    templates: list[dict[str, Any]] = []
    for child in sorted(root.iterdir(), key=lambda item: item.name.lower()):
        if not child.is_dir():
            continue
        if not _is_safe_template_id(child.name):
            continue

        compose_path = child / COMPOSE_FILENAME
        if not compose_path.exists():
            continue

        try:
            compose_doc = _load_compose_doc(compose_path)
            metadata = _compose_metadata(child.name, compose_doc, compose_path)
        except Exception:
            continue
        templates.append(metadata)
    return templates


def get_docker_template(template_id: str) -> Optional[dict[str, Any]]:
    try:
        compose_path = _compose_path_from_template_id(template_id)
    except ValueError:
        return None
    if not compose_path.exists():
        return None

    compose_doc = _load_compose_doc(compose_path)
    return _compose_metadata(template_id, compose_doc, compose_path)


def allocate_free_host_port(excluded_ports: Optional[set[int]] = None) -> int:
    excluded = excluded_ports or set()
    candidates = list(range(CHALLENGE_INSTANCE_PORT_MIN, CHALLENGE_INSTANCE_PORT_MAX + 1))
    random.SystemRandom().shuffle(candidates)

    for port in candidates:
        if port in excluded:
            continue
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("0.0.0.0", port))
            except OSError:
                continue
            return port
    raise RuntimeError(
        f"Could not allocate free host port in pool {CHALLENGE_INSTANCE_PORT_MIN}-{CHALLENGE_INSTANCE_PORT_MAX}"
    )


def _raise_docker_error(log: str) -> None:
    lower_log = log.lower()
    if "open //./pipe/dockerdesktoplinuxengine" in lower_log or "open //./pipe/docker_engine" in lower_log:
        raise RuntimeError(
            "Docker daemon is not available. Start Docker Desktop (or Docker Engine) and retry."
        )
    if "cannot connect to the docker daemon" in lower_log or "failed to connect to the docker api" in lower_log:
        raise RuntimeError(
            "Cannot connect to Docker daemon. Check Docker service status and docker context."
        )
    raise RuntimeError(log)


def _run_docker_command(
    args: list[str],
    *,
    cwd: Optional[str] = None,
    timeout: int = 180,
) -> subprocess.CompletedProcess[str]:
    command = [*_docker_base_command(), *args]
    try:
        return subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("Docker CLI not found on server") from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Docker command timed out") from exc


def _sanitize_image_token(value: str) -> str:
    token = _SAFE_IMAGE_TOKEN_RE.sub("-", value.strip().lower())
    token = token.strip("-")
    return token or "default"


def _template_build_project_name(template_id: str) -> str:
    return f"casctf-template-build-{_sanitize_image_token(template_id)}"


def _template_service_image_tag(template_id: str, service_name: str) -> str:
    return (
        f"casctf-template-{_sanitize_image_token(template_id)}-"
        f"{_sanitize_image_token(service_name)}:latest"
    )


def _docker_image_exists(image_tag: str) -> bool:
    result = _run_docker_command(["image", "inspect", image_tag], timeout=60)
    return result.returncode == 0


def _compose_service_image_id(compose_file_path: Path, project_name: str, service_name: str) -> str:
    result = _run_docker_command(
        [
            "compose",
            "-f",
            str(compose_file_path),
            "-p",
            project_name,
            "config",
            "--images",
            service_name,
        ],
        cwd=str(compose_file_path.parent),
        timeout=60,
    )
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        _raise_docker_error(stderr or stdout or "Could not inspect compose service image")

    image_ref = ""
    for line in (result.stdout or "").splitlines():
        candidate = line.strip()
        if candidate:
            image_ref = candidate
            break
    if not image_ref:
        raise RuntimeError(f"Image reference for service '{service_name}' is empty after compose build")

    inspect_result = _run_docker_command(
        ["image", "inspect", "--format", "{{.Id}}", image_ref],
        timeout=60,
    )
    if inspect_result.returncode != 0:
        stderr = (inspect_result.stderr or "").strip()
        stdout = (inspect_result.stdout or "").strip()
        _raise_docker_error(stderr or stdout or f"Failed to inspect image '{image_ref}'")

    image_id = (inspect_result.stdout or "").strip()
    if not image_id:
        raise RuntimeError(f"Image build output for service '{service_name}' is empty")
    return image_id


def _ensure_template_service_image(
    *,
    template_id: str,
    compose_file_path: Path,
    service_name: str,
) -> str:
    image_tag = _template_service_image_tag(template_id, service_name)
    if _docker_image_exists(image_tag):
        return image_tag

    build_project = _template_build_project_name(template_id)
    _run_compose(compose_file_path, build_project, ["build", service_name])

    image_id = _compose_service_image_id(compose_file_path, build_project, service_name)
    result = _run_docker_command(["image", "tag", image_id, image_tag], timeout=60)
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        _raise_docker_error(stderr or stdout or "Failed to tag built image")
    return image_tag


def _resolve_runtime_service_images(
    *,
    template_id: str,
    compose_file_path: Path,
    compose_doc: dict[str, Any],
) -> dict[str, str]:
    resolved: dict[str, str] = {}
    services = compose_doc.get("services", {})
    if not isinstance(services, dict):
        return resolved

    for service_name, service_cfg in services.items():
        if not isinstance(service_name, str) or not isinstance(service_cfg, dict):
            continue
        service_image = service_cfg.get("image")
        if isinstance(service_image, str) and service_image.strip():
            resolved[service_name] = service_image.strip()
            continue
        if "build" in service_cfg:
            resolved[service_name] = _ensure_template_service_image(
                template_id=template_id,
                compose_file_path=compose_file_path,
                service_name=service_name,
            )
    return resolved


def build_runtime_compose_file(
    *,
    template_id: str,
    project_name: str,
    service_name: str,
    host_port: int,
    container_port: int,
) -> Path:
    compose_path = _compose_path_from_template_id(template_id)
    compose_doc = _load_compose_doc(compose_path)
    service_images = _resolve_runtime_service_images(
        template_id=template_id,
        compose_file_path=compose_path,
        compose_doc=compose_doc,
    )
    runtime_doc = copy.deepcopy(compose_doc)

    services = runtime_doc["services"]
    if service_name not in services or not isinstance(services[service_name], dict):
        raise ValueError("Service not found in compose")

    for _, cfg in services.items():
        if not isinstance(cfg, dict):
            continue
        cfg.pop("container_name", None)
        cfg.pop("ports", None)
        cfg.pop("build", None)

    for candidate_service_name, candidate_cfg in services.items():
        if not isinstance(candidate_cfg, dict):
            continue
        resolved_image = service_images.get(candidate_service_name)
        if resolved_image:
            candidate_cfg["image"] = resolved_image

    services[service_name]["ports"] = [f"{host_port}:{container_port}"]

    runtime_path = compose_path.parent / f".casctf-{project_name}.yml"
    with runtime_path.open("w", encoding="utf-8") as fp:
        yaml.safe_dump(runtime_doc, fp, sort_keys=False, allow_unicode=False)
    return runtime_path


def _run_compose(compose_file_path: Path, project_name: str, args: list[str]) -> None:
    result = _run_docker_command(
        [
            "compose",
            "-f",
            str(compose_file_path),
            "-p",
            project_name,
            *args,
        ],
        cwd=str(compose_file_path.parent),
        timeout=180,
    )

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        log = stderr or stdout or "Unknown docker compose error"
        _raise_docker_error(log)


def start_compose_project(compose_file_path: Path, project_name: str) -> None:
    _run_compose(compose_file_path, project_name, ["up", "-d", "--no-build"])


def stop_compose_project(compose_file_path: Path, project_name: str) -> None:
    _run_compose(compose_file_path, project_name, ["down", "--remove-orphans", "-v"])


def remove_runtime_compose_file(compose_file_path: Path) -> None:
    try:
        compose_file_path.unlink(missing_ok=True)
    except OSError:
        return


def generate_project_name(challenge_id: int, user_id: int) -> str:
    return f"casctf-c{challenge_id}-u{user_id}-{uuid4().hex[:6]}"
