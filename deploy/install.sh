#!/usr/bin/env bash
# Installs the storage bot as a systemd service on Ubuntu (Oracle Cloud free tier).
set -euo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="telegram-file-bot"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
RUN_USER="${SUDO_USER:-$(id -un)}"

say() { printf '%s\n' "$*"; }
die() { printf 'Error: %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -ne 0 ]] || die "Run this as your normal user (for example 'ubuntu'), not as root. It calls sudo itself."
[[ -f "${APP_DIR}/bot.py" ]] || die "bot.py was not found in ${APP_DIR}."
[[ -f "${APP_DIR}/requirements.txt" ]] || die "requirements.txt was not found in ${APP_DIR}."

if [[ ! -f "${APP_DIR}/.env" ]]; then
    say "No .env in ${APP_DIR}."
    say "Copy the .env from the PC that ran the bot, or create one from .env.example."
    exit 1
fi

chmod 600 "${APP_DIR}/.env"
sed -i 's/\r$//' "${APP_DIR}/.env"
grep -Eq '^[[:space:]]*BOT_TOKEN[[:space:]]*=[[:space:]]*.+' "${APP_DIR}/.env" || die ".env is missing a BOT_TOKEN value."
grep -Eq '^[[:space:]]*OWNER_ID[[:space:]]*=[[:space:]]*[0-9]+' "${APP_DIR}/.env" || die ".env is missing a numeric OWNER_ID."

if ! python3 -c 'import venv, ensurepip' >/dev/null 2>&1; then
    say "Installing Python venv support..."
    sudo apt-get update -y
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-venv python3-pip
fi

if [[ ! -x "${APP_DIR}/.venv/bin/python" ]]; then
    python3 -m venv "${APP_DIR}/.venv"
fi

"${APP_DIR}/.venv/bin/python" -m pip install --quiet --upgrade pip
"${APP_DIR}/.venv/bin/python" -m pip install --quiet -r "${APP_DIR}/requirements.txt"

mkdir -p "${APP_DIR}/data"
chmod 700 "${APP_DIR}/data"
if [[ ! -f "${APP_DIR}/data/files.db" ]]; then
    say "Warning: data/files.db is missing, so the bot starts with an empty index."
    say "Copy the files.db from the other PC into ${APP_DIR}/data/ and re-run this script."
fi

if command -v flock >/dev/null 2>&1; then
    RUNTIME_LINE="RuntimeDirectory=${SERVICE_NAME}"
    EXEC_START="/usr/bin/flock -n /run/${SERVICE_NAME}/bot.lock \"${APP_DIR}/.venv/bin/python\" \"${APP_DIR}/bot.py\""
else
    RUNTIME_LINE=""
    EXEC_START="\"${APP_DIR}/.venv/bin/python\" \"${APP_DIR}/bot.py\""
fi

sudo tee "${SERVICE_FILE}" >/dev/null <<EOF
[Unit]
Description=Telegram File Storage Bot
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${APP_DIR}
Environment=PYTHONUNBUFFERED=1
${RUNTIME_LINE}
ExecStart=${EXEC_START}
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}" >/dev/null
sudo systemctl restart "${SERVICE_NAME}"
sleep 4

if ! sudo systemctl is-active --quiet "${SERVICE_NAME}"; then
    say "The service did not stay running. Recent logs:"
    sudo journalctl -u "${SERVICE_NAME}" -n 40 --no-pager || true
    exit 1
fi

say ""
say "Bot service is running as '${SERVICE_NAME}'."
say "Logs:   sudo journalctl -u ${SERVICE_NAME} -f"
say "Status: sudo systemctl status ${SERVICE_NAME}"
say "Stop:   sudo systemctl stop ${SERVICE_NAME}"
say ""
say "This VM is now the only poller. The Explorer never runs the bot on a PC."
