from pydantic import BaseModel


# 회원가입 요청 바디 스키마
class UserCreate(BaseModel):
    username: str
    password: str


# 로그인 요청 바디 스키마
class UserLogin(BaseModel):
    username: str
    password: str


# 로그인 성공 응답 스키마
class LoginResponse(BaseModel):
    message: str
    username: str
    role: str
    score: int


# 현재 로그인 사용자 응답
class CurrentUserResponse(BaseModel):
    username: str
    role: str
    score: int

