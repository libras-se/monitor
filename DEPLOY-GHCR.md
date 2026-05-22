# Deploy do Monitor em Produção (GHCR)

O **GitHub Actions** builda a imagem e publica no **GHCR** (`ghcr.io`). O **Dokploy** só referencia a imagem (sem build no servidor), igual à API.

## Imagem

```txt
ghcr.io/<owner-em-minusculas>/libras-monitor:latest
```

Workflow: `.github/workflows/deploy.yml` — push na **`main`** ou *Run workflow*.

## Secrets no repositório do Monitor (GitHub)

Use um **`DOKPLOY_APPLICATION_ID` próprio** desta aplicação (não reutilize o da API).

| Secret | Uso |
|--------|-----|
| `DOKPLOY_URL` | URL do painel Dokploy |
| `DOKPLOY_API_KEY` | API key |
| `DOKPLOY_APPLICATION_ID` | ID da app **Monitor** no Dokploy |

`GITHUB_TOKEN` do workflow já publica no GHCR (`packages: write`).

## Dokploy

1. Fonte: **Docker Image** / imagem pré-buildada (não Git build).
2. Imagem: `ghcr.io/<owner>/libras-monitor:latest`
3. Registry `ghcr.io` + PAT `read:packages` se o pacote for privado.
4. Porta interna: **`3100`**
5. Variáveis de ambiente (produção) — exemplos:

```env
MONITOR_PUBLIC_URL=https://status.seudominio.com
API_BASE_URL=https://api.seudominio.com
API_READY_PATH=/ready
WORKER_HEALTH_URL=http://libras-worker:9099/health
HUET_BASE_URL=https://app.seudominio.com
TILS_BASE_URL=https://admin.seudominio.com
RABBITMQ_MANAGEMENT_URL=http://rabbitmq:15672
STORAGE_HEALTH_URL=http://minio:9000/minio/health/live
DATABASE_URL=postgresql://...
SLACK_ALERTS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
CRON_SECRET=...
```

URLs internas no cluster Docker/Swarm: use hostnames dos serviços Dokploy (`libras-api`, `libras-worker`, etc.), não `localhost`.

6. Healthcheck (dentro do container):

```txt
http://127.0.0.1:3100/api/health
```

Não use `/api/status` se `MONITOR_API_KEY` estiver definido.

Formato Swarm (argv separados):

```json
{
  "Test": ["CMD", "curl", "-fsS", "--max-time", "8", "http://127.0.0.1:3100/api/health"],
  "Interval": 20000000000,
  "Timeout": 10000000000,
  "StartPeriod": 90000000000,
  "Retries": 5
}
```

## Cron de alertas (opcional)

Agende HTTP POST para o próprio monitor (ou job externo):

```bash
curl -X POST "https://status.seudominio.com/api/cron/check" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Referência — portas Libras

| App | Imagem | Porta |
|-----|--------|-------|
| API | `libras-api` | 7070 |
| Huet | `libras-huet` | 3000 |
| Tils | `libras-tils` | 3000 |
| Worker | `libras-worker` | 9099 |
| Monitor | `libras-monitor` | 3100 |
