FROM node

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . /app

EXPOSE 5001

CMD [ "node", "server.js" ]