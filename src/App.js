import React, { useState } from 'react';
import { Container } from 'reactstrap';
import { getTokenOrRefresh } from './token_util';
import './custom.css'
import { ResultReason } from 'microsoft-cognitiveservices-speech-sdk';
import axios from "axios"; // npm install axios 필요

const speechsdk = require('microsoft-cognitiveservices-speech-sdk')

export default function App() { 
    const [displayText, setDisplayText] = useState('INITIALIZED: ready to test speech...');
    const [player, updatePlayer] = useState({p: undefined, muted: false});

    async function sttFromMic() {
        const tokenObj = await getTokenOrRefresh();
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        speechConfig.speechRecognitionLanguage = 'ko-KR';
        
        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

        setDisplayText('speak into your microphone...');

        recognizer.recognizeOnceAsync(result => {
            if (result.reason === ResultReason.RecognizedSpeech) {
                setDisplayText(`RECOGNIZED: Text=${result.text}`);
                callAiApi(result.text);
            } else {
                setDisplayText('ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly.');
            }
        });
    }

    async function textToSpeech() {
        const tokenObj = await getTokenOrRefresh();
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        const myPlayer = new speechsdk.SpeakerAudioDestination();
        updatePlayer(p => {p.p = myPlayer; return p;});
        const audioConfig = speechsdk.AudioConfig.fromSpeakerOutput(player.p);

        let synthesizer = new speechsdk.SpeechSynthesizer(speechConfig, audioConfig);

        const textToSpeak = 'This is an example of speech synthesis for a long passage of text. Pressing the mute button should pause/resume the audio output.';
        setDisplayText(`speaking text: ${textToSpeak}...`);
        synthesizer.speakTextAsync(
        textToSpeak,
        result => {
            let text;
            if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                text = `synthesis finished for "${textToSpeak}".\n`
            } else if (result.reason === speechsdk.ResultReason.Canceled) {
                text = `synthesis failed. Error detail: ${result.errorDetails}.\n`
            }
            synthesizer.close();
            synthesizer = undefined;
            setDisplayText(text);
        },
        function (err) {
            setDisplayText(`Error: ${err}.\n`);

            synthesizer.close();
            synthesizer = undefined;
        });
    }

    async function handleMute() {
        updatePlayer(p => { 
            if (!p.muted) {
                p.p.pause();
                return {p: p.p, muted: true}; 
            } else {
                p.p.resume();
                return {p: p.p, muted: false}; 
            }
        });
    }

    async function fileChange(event) {
        const audioFile = event.target.files[0];
        console.log(audioFile);
        const fileInfo = audioFile.name + ` size=${audioFile.size} bytes `;

        setDisplayText(fileInfo);

        const tokenObj = await getTokenOrRefresh();
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        speechConfig.speechRecognitionLanguage = 'ko-KR';

        const audioConfig = speechsdk.AudioConfig.fromWavFileInput(audioFile);
        const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizeOnceAsync(result => {
            let text;
            if (result.reason === ResultReason.RecognizedSpeech) {
                text = `RECOGNIZED: Text=${result.text}`
            } else {
                text = 'ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly.';
            }

            setDisplayText(fileInfo + text);
        });
    }

    async function callAiApi(text) {
        const url = "https://25047-m9mdelel-eastus2.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview";
        const headers = {
            "Content-Type": "application/json",
            "api-key": "3wGlxEdoz4X5ZBFl7ZebwodS6hBIONES8VwB9KMzpRf7q76y16hXJQQJ99BDACHYHv6XJ3w3AAAAACOGSgKr"
        };
        const data = {
            messages: [
                {
                    "role": "system",
                    "content": "검색과 필터링에 사용할 키워드를 추출할 거야. 의류 상품이나 특징과 관련된 키워드를 추출해서, ','으로 구분해줘"
                },
                {
                    "role": "user",
                    "content": text
                }
            ]
        };
      
        axios.post(url, data, { headers })
            .then((response) => {
                console.log(response)
            })
            .catch((error) => {
                console.error(error)
            });
    }

    return (
        <Container className="app-container">
            <h1 className="display-4 mb-3">Speech sample app</h1>

            <div className="row main-container">
                <div className="col-6">
                    <i className="fas fa-microphone fa-lg mr-2" onClick={() => sttFromMic()}></i>
                    Convert speech to text from your mic.

                    <div className="mt-2">
                        <label htmlFor="audio-file"><i className="fas fa-file-audio fa-lg mr-2"></i></label>
                        <input 
                            type="file" 
                            id="audio-file" 
                            onChange={(e) => fileChange(e)} 
                            style={{display: "none"}} 
                        />
                        Convert speech to text from an audio file.
                    </div>
                    <div className="mt-2">
                        <i className="fas fa-volume-up fa-lg mr-2" onClick={() => textToSpeech()}></i>
                        Convert text to speech.
                    </div>
                    <div className="mt-2">
                        <i className="fas fa-volume-mute fa-lg mr-2" onClick={() => handleMute()}></i>
                        Pause/resume text to speech output.
                    </div>

                </div>
                <div className="col-6 output-display rounded">
                    <code>{displayText}</code>
                </div>
            </div>
        </Container>
    );
}