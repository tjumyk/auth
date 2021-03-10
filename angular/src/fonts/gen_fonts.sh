#!/bin/bash

java -jar ~/IdeaProjects/web-font-generator/dist/webfontgen.jar *.ttf  -d -i font-helper.html -out build -c build/styles.css
