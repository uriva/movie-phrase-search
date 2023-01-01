FROM node:19

RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y ffmpeg

RUN git clone git@github.com:uriva/movie-phrase-search.git
RUN cd movie-phrase-search
RUN npm install
RUN cd ../
RUN node src/server.js
