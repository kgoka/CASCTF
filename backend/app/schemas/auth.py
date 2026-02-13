from pydantic import BaseModel


# 회원가입 요청 바디 스키마
class UserCreate(BaseModel):
    username: str
    password: str


# 로그인 요청 바디 스키마
class UserLogin(BaseModel):
    username: str
    password: str
