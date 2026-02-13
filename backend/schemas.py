from pydantic import BaseModel

# 회원가입/로그인 때 받을 데이터
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str