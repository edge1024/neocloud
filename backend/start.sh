#!/bin/bash
# 启动 FastAPI 后端
# 首次运行: pip install -r requirements.txt
cd "$(dirname "$0")"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
