FROM docker.io/node:22 as node
RUN npm i -g pnpm
WORKDIR /app/
COPY package.json pnpm-lock.yaml /app/
RUN pnpm i
COPY . /app/
RUN pnpm run build

FROM docker.io/nginxinc/nginx-unprivileged

RUN echo 'server { \
    listen 8080; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass https://plex-catalog-backend-plex-catalog.apps.okd4.csh.rit.edu/api/; \
        proxy_set_header Host plex-catalog-backend-plex-catalog.apps.okd4.csh.rit.edu; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_ssl_server_name on; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
COPY --from=node /app/dist /usr/share/nginx/html