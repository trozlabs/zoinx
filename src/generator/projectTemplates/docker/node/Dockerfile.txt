FROM node:22.15-bookworm AS builder

#COPY certs/cert.pem /usr/local/share/ca-certificates/cert.pem

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    librdkafka-dev \
    iputils-ping \
    sudo \
    vim \
    net-tools \
    ca-certificates && \
    update-ca-certificates \ && \
    rm -rf /var/lib/apt/lists/* \

#RUN npm config set strict-ssl true \ &&  \
#    npm config set registry "https://registry.npmjs.org/"

#ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/cert.pem

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci || npm install
