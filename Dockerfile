FROM node:19

RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y ffmpeg

