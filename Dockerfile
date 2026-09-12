FROM node:20-alpine

WORKDIR /app

# Copy package files first so npm install is cached unless these change
COPY package*.json ./
RUN npm install

# Now copy the rest of the source (including migrations/)
COPY . .

EXPOSE 3000

# Run pending migrations, then start the server.
# All env vars (JWT_SECRET, DATABASE_URL, etc.) are injected by docker-compose at runtime.
CMD sh -c "npx node-pg-migrate up && node index.js"