import bcrypt
import hashlib
import re

_SHA256_HEX_RE = re.compile(r"^[0-9a-f]{64}$")

def _normalize_password_input(password: str) -> str:
    """
    标准化密码输入：
    - 如果看起来不是 SHA256(HEX)（长度64且为十六进制），则先做一次 SHA256，再转为 hex 字符串
    - 如果已经是 SHA256(HEX)，保持不变
    这样既兼容“前端已做 SHA256”的方案，也兼容“前端传原始密码”的方案
    """
    pwd = (password or "").strip()
    if _SHA256_HEX_RE.match(pwd):
        return pwd
    return hashlib.sha256(pwd.encode("utf-8")).hexdigest()


def verify_password(input_password: str, hashed_password: str) -> bool:
    """
    验证密码：支持原始密码或已做 SHA256 的密码
    - 数据库中存储的是 bcrypt(sha256(password))
    - 这里会把输入先标准化为 sha256 hex 后再做校验
    """
    normalized = _normalize_password_input(input_password)
    return bcrypt.checkpw(
        normalized.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """
    生成安全密码哈希：bcrypt(sha256(password))
    - 兼容：如果 password 已是 SHA256 hex 也可正常处理
    """
    normalized = _normalize_password_input(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(normalized.encode('utf-8'), salt).decode('utf-8')