FROM node:alpine
WORKDIR /usr/src/app
COPY ./package*.json . 
RUN npm install
COPY . .

CMD ["npm", "start"] 
#CMD ["sleep", "3600"]  # Use if you need to stop the contianer exiting whilst installing nodemon