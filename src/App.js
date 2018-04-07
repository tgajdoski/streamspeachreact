import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import TextareaAutosize from 'react-autosize-textarea';

import angry from './images/angry-face.png';
import confused from './images/confused-face.png';
import neutral from './images/neutral-face.png';
import smiling from './images/slightly-smiling-face.png';


const io = require('socket.io-client')
const socket = io('http://localhost:3555');
const ss = require('socket.io-stream');
var ssStream = ss.createStream();
let scriptNode;
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
const languageSelected = 'en-US'; // this.selected;



class App extends Component {
  constructor() {
    super();
    this.state = {
      text: 'talk something',
      image: neutral,
      sentimentText: 'Neutral',
    };
    this.create();
  }

  create() {
     const that = this;
    // socket.on('SPEECH_RESULTS', function (text) {
    //   console.log('TEXT ', text);
    //   that.setState({
    //     text: text,
    //   })
    // });

    if (navigator.mediaDevices.getUserMedia) {
      console.log('getUserMedia supported...');
      navigator.webkitGetUserMedia({ audio: true }, function (stream) {
        that.successCallback(stream)
      }, function (error) {
        that.errorCallback(error)
      });
    } else {
      console.log('getUserMedia not supported on your browser!');
    }
  };


  successCallback(stream) {
    const vm = this;
    console.log('successCallback:....IN');
    var input = audioContext.createMediaStreamSource(stream);
    var bufferSize = 2048;
    scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
    scriptNode.onaudioprocess = scriptNodeProcess;
    input.connect(scriptNode);

    // console.log('ScriptNode BufferSize:', scriptNode.bufferSize);
    function scriptNodeProcess(audioProcessingEvent) {
      var inputBuffer = audioProcessingEvent.inputBuffer;
      var outputBuffer = audioProcessingEvent.outputBuffer;
      var inputData = inputBuffer.getChannelData(0);
      var outputData = outputBuffer.getChannelData(0);


      // Loop through the 4096 samples
      for (var sample = 0; sample < inputBuffer.length; sample++) {
        outputData[sample] = inputData[sample];
      }
      ssStream.write(new ss.Buffer(vm.downsampleBuffer(inputData, 44100, 16000)));
    }
  };

  downsampleBuffer(buffer, sampleRate, outSampleRate) {
    if (outSampleRate ===  sampleRate) {
      return buffer;
    }
    if (outSampleRate > sampleRate) {
      throw "downsampling rate show be smaller than original sample rate";
    }
    var sampleRateRatio = sampleRate / outSampleRate;
    var newLength = Math.round(buffer.length / sampleRateRatio);
    var result = new Int16Array(newLength);
    var offsetResult = 0;
    var offsetBuffer = 0;
    while (offsetResult < result.length) {
      var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      var accum = 0,
        count = 0;
      for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = Math.min(1, accum / count) * 0x7FFF;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result.buffer;
  };

  startRecording() {
    socket.emit('LANGUAGE_SPEECH', languageSelected);
    this.result = true;
    this.btn = false;
    this.btnStop = true;
    try{
    scriptNode.connect(audioContext.destination);
    ss(socket).emit('START_SPEECH', ssStream);
    }catch(err){};
    
    setInterval(function () {
      this.stopRecording();
    }.bind(this), 55000);
  };

  stopRecording() {
    this.btnStop = false;
    this.btn = true;
    try{
    scriptNode.disconnect(audioContext.destination);
    }
    catch(err)
    {};
    // ssStream.end();
    socket.emit('STOP_SPEECH', {});
  };

  errorCallback(error) {
    console.log('errorCallback:', error);
  };

  redirectError() {
    window.location.href = "http://localhost:8080/"
  };


 getImage(documentSentiment){

  // Clearly Positive*	"score": 0.8, "magnitude": 3.0
  // Clearly Negative*	"score": -0.6, "magnitude": 4.0
  // Neutral	"score": 0.1, "magnitude": 0.0
  // Mixed	"score": 0.0, "magnitude": 4.0

  let {score, magnitude} = documentSentiment;

let imageUrl = neutral;
let sentimentText = 'Clearly Positive';

if (score > 0.6){
  imageUrl = smiling;
 sentimentText = 'Clearly Positive';
}
else if (score < 0){
  imageUrl = angry;
 sentimentText = 'Clearly Negative';
}
else if (score >=0 && magnitude >2){
  imageUrl = confused;
 sentimentText = 'Mixed ';
}
else{
  imageUrl = neutral;
  sentimentText = 'Neutral ';
}

  this.setState({
    image: imageUrl,
    sentimentText: sentimentText
  });

 }

  onClickButton() {
    this.startRecording();
    // console.log("START");
    // socket.emit('LANGUAGE_SPEECH', languageSelected);
    let that = this;
    socket.on('SPEECH_RESULTS', function (data) {
      console.log(data);
      
      let texttot = '';
      if (that.state.totaltext)
        texttot = that.state.totaltext + ' ' + data;
      else
        texttot += data;

      socket.emit('SENTIMENT', texttot);// that.state.totaltext);  
      that.setState({
        text: data,
        totaltext: texttot
      });
    });

    socket.on('ANALYSIS', function (sentiment) {
      that.getImage(sentiment.documentSentiment)
      that.setState({
        sentiment: JSON.stringify(sentiment.documentSentiment)
      });

      console.log(' ANALYSIS', sentiment );
  })

  };

  render() {
   
    // socket.on('event', function(data){});
    // socket.on('disconnect', function(){});

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h3 className="App-title">Welcome to React</h3>
        </header>

        

        <button id="button" onClick={this.onClickButton.bind(this)}>Listen To Microphone</button>
        <div className="App-Text">{this.state.text}</div>

        <TextareaAutosize style={{marginTop: 100, width: 300}} rows={3} placeholder='total text here' value={this.state.totaltext}/>
        <img style={{marginTop: 100, width: 128, height: 128}} alt="face sentiment"  src={this.state.image} />
       
         <TextareaAutosize style={{marginTop: 100, width: 400}} rows={3} placeholder='sentiment analysis' value={this.state.sentiment}/>

         
      </div>
    );
  }
}

export default App;
