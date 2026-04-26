#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

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

require_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker is not installed or not in PATH."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not available."
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local attempts="${3:-45}"

  info "Waiting for $name"
  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      info "$name is ready"
      return 0
    fi
    sleep 2
  done

  warn "$name did not become ready in time. Showing recent logs."
  docker compose logs --tail=80
  return 1
}

start_stack() {
  require_docker

  info "Building and starting the full project"
  docker compose up --build -d

  wait_for_url "ML service" "http://127.0.0.1:7000/health"
  wait_for_url "Backend" "http://127.0.0.1:8080/api/health"
  wait_for_url "Frontend" "http://127.0.0.1:5174/"

  info "Project is running"
  printf "\n"
  printf "Frontend:  http://127.0.0.1:5174\n"
  printf "Backend:   http://127.0.0.1:8080/api/health\n"
  printf "ML API:    http://127.0.0.1:7000/health\n"
  printf "\n"
  printf "Use Signup first, then add a student and analyze a message.\n"
}

stop_stack() {
  require_docker
  info "Stopping the project"
  docker compose down
}

clean_stack() {
  require_docker
  warn "This stops containers and deletes MongoDB Docker volume data."
  docker compose down -v
}

show_logs() {
  require_docker
  docker compose logs -f
}

case "${1:-start}" in
  start)
    start_stack
    ;;
  stop)
    stop_stack
    ;;
  clean)
    clean_stack
    ;;
  logs)
    show_logs
    ;;
  restart)
    stop_stack
    start_stack
    ;;
  *)
    echo "Usage: ./run_all.sh [start|stop|restart|logs|clean]"
    echo "  start   - build and run MongoDB, ML service, backend, and frontend"
    echo "  stop    - stop containers without deleting data"
    echo "  restart - stop and start again"
    echo "  logs    - follow all container logs"
    echo "  clean   - stop containers and delete MongoDB data"
    exit 1
    ;;
esac
