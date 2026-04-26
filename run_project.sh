#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

info() {
  printf "\033[1;34m[CyberGuard]\033[0m %s\n" "$1"
}

warn() {
  printf "\033[1;33m[Warning]\033[0m %s\n" "$1"
}

fail() {
  printf "\033[1;31m[Error]\033[0m %s\n" "$1"
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

port_busy() {
  local port="$1"
  lsof -i ":$port" >/dev/null 2>&1
}

stop_existing_pid() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      info "Stopping old $name process ($pid)"
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
    fi
    rm -f "$pid_file"
  fi
}

start_process() {
  local name="$1"
  local workdir="$2"
  shift 2

  stop_existing_pid "$name"
  info "Starting $name"
  (
    cd "$workdir"
    "$@"
  ) >"$LOG_DIR/$name.log" 2>&1 &
  echo "$!" >"$PID_DIR/$name.pid"
}

setup_ml_service() {
  command_exists python3 || fail "python3 is required."

  cd "$ROOT_DIR/ml-service"
  if [[ ! -d ".venv" ]]; then
    info "Creating ML service virtual environment"
    python3 -m venv .venv
  fi

  info "Installing ML service dependencies"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -r requirements.txt >/dev/null
}

setup_backend() {
  command_exists npm || fail "npm is required for the Node backend/frontend."

  cd "$ROOT_DIR/backend"
  if [[ ! -f ".env" && -f ".env.example" ]]; then
    cp .env.example .env
  fi
  if [[ ! -d "node_modules" ]]; then
    info "Installing backend dependencies"
    npm install >/dev/null
  fi
}

setup_frontend() {
  command_exists npm || fail "npm is required for the frontend."

  cd "$ROOT_DIR/frontend"
  if [[ ! -f ".env" && -f ".env.example" ]]; then
    cp .env.example .env
  fi
  if [[ ! -d "node_modules" ]]; then
    info "Installing frontend dependencies"
    npm install >/dev/null
  fi
}

start_mongo() {
  if command_exists docker && docker compose version >/dev/null 2>&1; then
    info "Starting MongoDB with Docker Compose"
    (cd "$ROOT_DIR" && docker compose up -d mongo)
    return
  fi

  warn "Docker Compose not found. Make sure MongoDB is already running on mongodb://127.0.0.1:27017/cyberguard"
}

run_full_stack() {
  if port_busy 7000; then warn "Port 7000 is already in use. ML service may already be running."; fi
  if port_busy 8080; then warn "Port 8080 is already in use. Backend may already be running."; fi
  if port_busy 5173; then warn "Port 5173 is already in use. Frontend may already be running."; fi

  start_mongo
  setup_ml_service
  setup_backend
  setup_frontend

  start_process "ml-service" "$ROOT_DIR/ml-service" .venv/bin/uvicorn src.main:app --host 127.0.0.1 --port 7000
  sleep 3
  start_process "backend" "$ROOT_DIR/backend" npm run dev
  sleep 3
  start_process "frontend" "$ROOT_DIR/frontend" npm run dev -- --host 127.0.0.1

  info "Full stack is starting."
  info "Frontend:  http://127.0.0.1:5173"
  info "Backend:   http://127.0.0.1:8080/api/health"
  info "ML API:    http://127.0.0.1:7000/health"
  info "Logs:      $LOG_DIR"
  info "Press Ctrl+C to stop the app processes started by this script."

  trap cleanup INT TERM
  tail -f "$LOG_DIR/ml-service.log" "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
}

run_flask_demo() {
  command_exists python3 || fail "python3 is required."

  cd "$ROOT_DIR"
  if [[ ! -d ".venv" ]]; then
    info "Creating Flask demo virtual environment"
    python3 -m venv .venv
  fi

  # shellcheck disable=SC1091
  source .venv/bin/activate
  info "Installing Flask demo dependencies"
  pip install -r requirements.txt >/dev/null
  info "Starting original Flask demo on http://127.0.0.1:5050"
  python app.py
}

cleanup() {
  info "Stopping app processes"
  for name in ml-service backend frontend; do
    stop_existing_pid "$name"
  done
  info "Stopped. MongoDB container is left running so data is not interrupted."
  exit 0
}

case "${1:-full}" in
  full)
    run_full_stack
    ;;
  flask)
    run_flask_demo
    ;;
  stop)
    cleanup
    ;;
  *)
    echo "Usage: ./run_project.sh [full|flask|stop]"
    echo "  full  - starts MongoDB, ML service, backend, and frontend"
    echo "  flask - starts the original single Flask demo"
    echo "  stop  - stops processes started by this script"
    exit 1
    ;;
esac
