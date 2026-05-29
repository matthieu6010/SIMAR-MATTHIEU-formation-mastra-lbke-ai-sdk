# Build + run the Mastra server with the Studio UI bundled.
# Single stage on the full node image (has the build toolchain needed by
# native deps). Build is done on the target host, so the architecture
# always matches.
FROM node:22

WORKDIR /app

# Install dependencies (uses package-lock.json when present)
COPY package*.json ./
RUN npm install

# Copy the source and build the server + studio UI
COPY . .
RUN npx mastra build --studio

ENV NODE_ENV=production
ENV PORT=4111
# Serve the bundled Studio UI alongside the API
ENV MASTRA_STUDIO_PATH=.mastra/output/studio

EXPOSE 4111

CMD ["node", ".mastra/output/index.mjs"]
