"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = "OSINT" | "Web" | "Forensics" | "Pwn" | "Reversing" | "Network";
type ChallengeState = "Visible" | "Hidden";
type ScoreType = "basic" | "dynamic";

type ChallengeItem = {
  id: number;
  name: string;
  category: Category;
  message: string;
  point: number;
  state: ChallengeState;
  score_type: ScoreType;
  attachment_file_id: number | null;
  attachment_file_name?: string | null;
};

type UploadedChallengeFile = {
  id: number;
  original_name: string;
  content_type?: string | null;
  file_size: number;
};

const CATEGORY_OPTIONS: Category[] = ["OSINT", "Web", "Forensics", "Pwn", "Reversing", "Network"];
const STATE_OPTIONS: ChallengeState[] = ["Visible", "Hidden"];
const REGISTERED_DOCKER_IMAGES = ["ubuntu-ctf:latest", "kali-mini:v1", "debian-web:v2"];

export default function AdminChallengePage() {
  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

  const [inputKeyword, setInputKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<ChallengeItem | null>(null);

  const [scoreType, setScoreType] = useState<ScoreType>("basic");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Web");
  const [message, setMessage] = useState("");
  const [point, setPoint] = useState("100");
  const [state, setState] = useState<ChallengeState>("Visible");
  const [flag, setFlag] = useState("");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [attachmentFileId, setAttachmentFileId] = useState<number | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState("");

  const [selectedDockerImage, setSelectedDockerImage] = useState(REGISTERED_DOCKER_IMAGES[0]);
  const [dockerImageLabel, setDockerImageLabel] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const filteredChallenges = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return challenges;
    }
    return challenges.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [challenges, searchKeyword]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`${apiBaseUrl}/api/challenges/admin`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data?.detail ?? "Failed to load challenges.");
        setChallenges([]);
        return;
      }

      const data = (await res.json()) as ChallengeItem[];
      setChallenges(data);
    } catch {
      setErrorMessage("Cannot reach backend server.");
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChallenges();
  }, [apiBaseUrl]);

  const resetForm = () => {
    setEditingChallenge(null);
    setScoreType("basic");
    setName("");
    setCategory("Web");
    setMessage("");
    setPoint("100");
    setState("Visible");
    setFlag("");
    setUploadFile(null);
    setUploadingFile(false);
    setFileInputKey((prev) => prev + 1);
    setAttachmentFileId(null);
    setAttachmentFileName("");
    setSelectedDockerImage(REGISTERED_DOCKER_IMAGES[0]);
    setDockerImageLabel("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (item: ChallengeItem) => {
    setEditingChallenge(item);
    setScoreType(item.score_type);
    setName(item.name);
    setCategory(item.category);
    setMessage(item.message);
    setPoint(String(item.point));
    setState(item.state);
    setFlag("");
    setUploadFile(null);
    setFileInputKey((prev) => prev + 1);
    setAttachmentFileId(item.attachment_file_id ?? null);
    setAttachmentFileName(item.attachment_file_name ?? "");
    setDockerImageLabel("");
    setShowFormModal(true);
  };

  const closeModal = () => {
    setShowFormModal(false);
  };

  const handleUploadChallengeFile = async () => {
    if (!uploadFile) {
      alert("Upload file first.");
      return;
    }

    const uploadUrl = `${apiBaseUrl}/api/challenges/files?filename=${encodeURIComponent(uploadFile.name)}`;

    try {
      setUploadingFile(true);
      const res = await fetch(uploadUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
        body: uploadFile,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.detail ?? "Failed to upload file.");
        return;
      }

      const data = (await res.json()) as UploadedChallengeFile;
      setAttachmentFileId(data.id);
      setAttachmentFileName(data.original_name);
      setUploadFile(null);
      setFileInputKey((prev) => prev + 1);
      alert("File uploaded and linked to this challenge form.");
    } catch {
      alert("Cannot reach backend server.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSelectDockerImage = () => {
    setDockerImageLabel(selectedDockerImage);
  };

  const handleSubmitChallenge = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Challenge name is required.");
      return;
    }

    const pointValue = Number(point);
    if (!Number.isFinite(pointValue) || pointValue < 1) {
      alert("Point must be a number greater than or equal to 1.");
      return;
    }

    if (!editingChallenge && !flag.trim()) {
      alert("Flag is required when creating a challenge.");
      return;
    }

    const payload: {
      name: string;
      category: Category;
      message: string;
      point: number;
      score_type: ScoreType;
      state: ChallengeState;
      flag?: string;
      attachment_file_id: number | null;
    } = {
      name: name.trim(),
      category,
      message: message.trim(),
      point: pointValue,
      score_type: scoreType,
      state,
      attachment_file_id: attachmentFileId,
    };

    if (flag.trim()) {
      payload.flag = flag.trim();
    }

    try {
      setSubmitting(true);

      const endpoint = editingChallenge
        ? `${apiBaseUrl}/api/challenges/${editingChallenge.id}`
        : `${apiBaseUrl}/api/challenges`;

      const method = editingChallenge ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.detail ?? "Failed to save challenge.");
        return;
      }

      closeModal();
      resetForm();
      await loadChallenges();
    } catch {
      alert("Cannot reach backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="frame rounded-xl px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Current Page</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-100">Challenges</h1>
      </section>

      <section className="frame min-h-[560px] rounded-xl px-5 py-5">
        <div className="flex flex-col gap-3 md:max-w-xl">
          <label htmlFor="challenge-search" className="text-xs uppercase tracking-[0.16em] text-zinc-400">
            Search Challenge By Title
          </label>
          <div className="flex gap-2">
            <input
              id="challenge-search"
              type="text"
              value={inputKeyword}
              onChange={(e) => setInputKeyword(e.target.value)}
              placeholder="Challenge title..."
              className="mono-input rounded-lg"
            />
            <button
              type="button"
              onClick={() => setSearchKeyword(inputKeyword)}
              className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Search
            </button>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-100 transition hover:bg-white hover:text-black"
          >
            Add Challenge
          </button>
        </div>

        {errorMessage && <p className="mt-4 text-sm text-red-300">{errorMessage}</p>}

        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.03]">
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.15em] text-zinc-400">
                <th className="px-4 py-3">Id</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Point</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Edit</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filteredChallenges.map((item) => (
                  <tr key={item.id} className="border-b border-white/10 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">{item.id}</td>
                    <td className="px-4 py-3 text-zinc-100">{item.name}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.category}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.point}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.attachment_file_name ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.state}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="mono-btn rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                    Loading challenges...
                  </td>
                </tr>
              )}

              {!loading && filteredChallenges.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                    No challenges found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showFormModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="frame grid w-full max-w-6xl gap-6 rounded-2xl p-5 md:grid-cols-[300px_1fr] md:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Score Type</p>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setScoreType("basic")}
                  className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                    scoreType === "basic"
                      ? "border-white/60 bg-white/15 text-zinc-100"
                      : "border-white/15 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.08]"
                  }`}
                >
                  Basic
                </button>
                <button
                  type="button"
                  onClick={() => setScoreType("dynamic")}
                  className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                    scoreType === "dynamic"
                      ? "border-white/60 bg-white/15 text-zinc-100"
                      : "border-white/15 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.08]"
                  }`}
                >
                  Dynamic
                </button>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Challenge File Upload</p>
                <input
                  key={fileInputKey}
                  type="file"
                  className="mono-input mt-3 rounded-lg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  disabled={uploadingFile || !uploadFile}
                  onClick={handleUploadChallengeFile}
                  className="mt-2 w-full rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingFile ? "Uploading..." : "Upload File"}
                </button>
                <p className="mt-2 text-xs text-zinc-500">{attachmentFileName || "No uploaded file selected"}</p>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Docker Image Selection</p>
                <p className="mt-2 text-[11px] text-zinc-500">
                  This is selection-only from registered images. It is not local file upload.
                </p>
                <select
                  value={selectedDockerImage}
                  onChange={(e) => setSelectedDockerImage(e.target.value)}
                  className="mono-input mt-3 rounded-lg"
                >
                  {REGISTERED_DOCKER_IMAGES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSelectDockerImage}
                  className="mt-2 w-full rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-200 hover:bg-white/10"
                >
                  Select
                </button>
                <p className="mt-2 text-xs text-zinc-500">{dockerImageLabel || "No image selected"}</p>
              </div>
            </aside>

            <form onSubmit={handleSubmitChallenge} className="rounded-xl border border-white/10 p-4 md:p-5">
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Challenge name"
                    className="mono-input rounded-lg"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="mono-input rounded-lg"
                    >
                      {CATEGORY_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value as ChallengeState)}
                      className="mono-input rounded-lg"
                    >
                      {STATE_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Challenge description"
                    className="mono-input min-h-[150px] resize-y rounded-lg"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Point</label>
                  <input
                    type="number"
                    min={1}
                    value={point}
                    onChange={(e) => setPoint(e.target.value)}
                    placeholder="Reward point"
                    className="mono-input rounded-lg"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">Flag</label>
                  <input
                    type="text"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                    placeholder={editingChallenge ? "Leave empty to keep existing flag" : "FLAG{...}"}
                    className="mono-input rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="mono-btn rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg border border-white/40 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingChallenge ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


