
const io = require('socket.io')(3555);
const ss = require('socket.io-stream');
const language = require('@google-cloud/language');

  

console.log('Server is starting....DONE');




io.on('connection', function (socket) {
    const record = require('node-record-lpcm16');
    const Speech = require('@google-cloud/speech');

// Instantiates a client
   const speech = Speech({
        keyFilename: './Reporto-c77c8844097a.json'
   });

   const languageClient = new language.LanguageServiceClient({
    projectId: "reporto-189514",
    keyFilename: './Reporto-c77c8844097a.json'
   });
   
  

    const encoding = 'LINEAR16';
    const sampleRateHertz = 16000;

    var request = {
        config: {
            encoding: encoding,
            sampleRateHertz: sampleRateHertz,
            languageCode: null
        },
        interimResults: false, // If you want interim results, set this to true
    };

    socket.on('LANGUAGE_SPEECH', function (language) {
        console.log('set language' ,language );
        request.config.languageCode = language;
    })


    // sentiment analysis
    socket.on('SENTIMENT', function (text) {
        console.log('set SENTIMENT', text );


        var document = {
            content : text,
            type : 'PLAIN_TEXT'
        };
        languageClient.analyzeSentiment({document: document}).then(function(responses) {
            var response = responses[0];
            // doThingsWith(response)
            socket.emit('ANALYSIS', response);
        })
        .catch(function(err) {
            console.error(err);
        });
    })

// Create a recognize stream
    const recognizeStream = speech.streamingRecognize(request)
        .on('error', function(error){
            console.log('ERROR:',error);
        })
        .on('data', function(data){
            console.log('GoogleData:',data);
            socket.emit('SPEECH_RESULTS',(data.results[0] && data.results[0].alternatives[0])
                ? `${data.results[0].alternatives[0].transcript}\n`
                : `Reached_transcription_time_limit`)
        });


    console.log('SERVER CONNECT');
    ss(socket).on('START_SPEECH', function (stream) {
        stream.pipe(recognizeStream);

    });

    socket.on('STOP_SPEECH', function () {
        console.log('Disconnected!');
    })
});

