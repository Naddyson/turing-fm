import _ from "lodash";
import {piano_notes} from "../knowledge/piano_notes";
import Sound from "react-sound";
import React from "react"
import $ from "jquery";
import {soundManager} from "soundmanager2";

const _ENDPOINT = "https://turing-fm-api.herokuapp.com/sequence";

export default class Helpers {
    constructor(gin) {
        this.gin = gin;
    }

    brutalSet = state => {
        this.gin.setState(state, 0);
    };

    changePlaybackRate = (state, value) => {
        state.orchestrator.playback_rate = value;
        this.gin.setState(state);
    };


    createSound = (path, callback) => {
        soundManager.createSound({
            url: path,
            onfinish: function () {
                soundManager._writeDebug(this.url + ' finished playing');
                if (callback) callback();
            }
        }).play();
    };

    createSoundById = id => {
        soundManager.createSound({
            id: id,
            url: '../mpc/audio/CHINA_1.mp3',
            onload: () => {

            },
            onfinish: () => {
                soundManager._writeDebug(this.id + ' finished playing');
                //soundManager.play(this.id + 1, {});
            }
        }).load();
    };

    getSoundById = id => {
        soundManager.getSoundById(id);
    };

    playSoundById = id => {
        soundManager.play(id, {});
    };

    requestSequence = (gin, callback) => {
        let XHR = ("onload" in new XMLHttpRequest()) ? XMLHttpRequest : XMLHttpRequest;
        let xhr = new XHR();
        xhr.open('GET', _ENDPOINT, true);
        xhr.onload = function () {
            _.each(JSON.parse(this.responseText), item => {
                gin.store.fetched_sequence.push(_.sample(_.filter(piano_notes, note => note.note === item)));
                _.each(gin.store.fetched_sequence, (part, key) => {
                    let tick = gin.store.tick;
                    gin.store.fetched_sequence[key].time = _.random(tick, tick * 10); // tick is a reference thus dynamic, to fix
                })
            });
            if (callback) callback();
        };
        xhr.send();
    };

    fetchFile = (file) => {
        let result;
        let audioContext = new AudioContext();

        fetch(file)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                console.log('Received', arrayBuffer);
                audioContext.decodeAudioData(arrayBuffer);
                return arrayBuffer
            })
            .then(audioBuffer => {
                let sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(audioContext.destination);
                sourceNode.start();
            })
            .catch(e => console.error(e));
    };

    fetchSequence = (seq) => {
        let fetchedNotes = [];
        _.each(seq, item => fetchedNotes.push(_.sample(_.filter(piano_notes, note => note.note === item))));
        return fetchedNotes
        //console.log(fetchedNotes);
    };

    drawCanvas() {
        var canvas = $("canvas")[0];
        var ctx = canvas.getContext('2d');
        var out = $(".out");
        var dropCount = 30;
        var drops = [];
        var nextAdd = -1000;
        var maxVelocity = .1;
        var width = 1050;
        var height = 7100;
        var addDrop = null;

        function rand(max, min) {
            min = min || 0;
            return Math.floor(Math.random() * (max - min)) + min;
        }

        function gradient(from, to) {
            var grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grd.addColorStop(0, from);
            grd.addColorStop(1, to);
            return grd;
        }

        var gradients = [
            gradient('green', 'blue')
        ];

        function updateDrops(tm) {
            if (!addDrop && (tm < nextAdd))
                return;
            nextAdd = tm + 10;

            if (!tm)
                addDrop = null;

            // remove the nulls
            drops = _.compact(drops);
            if (addDrop) {
                var x = !addDrop ? rand(width) : addDrop.x;
                var y = !addDrop ? rand(height) : addDrop.y;
                addDrop = null;

                drops.push({
                    x: x,
                    y: y,
                    start: tm,
                    vx: Math.random() * maxVelocity * 2 - maxVelocity,
                    vy: Math.random() * maxVelocity * 2 - maxVelocity,
                    g: rand(gradients.length),
                    r: rand(50, 40) * 3,
                    speed: rand(10, 1) * 2
                });
            }
        }

        function draw(tm) {
            canvas.width = $(window).width();
            canvas.height = $(window).height();

            // clear the field
            ctx.globalAlpha = 0;
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // update the drops
            updateDrops(tm);

            // draw the drops
            _.each(drops, function (drop, i) {
                if (drop) {
                    var erase = drawDrop(drop, tm, ctx, gradients[0]);
                    if (erase)
                        drops[i] = null;
                }
            });

            requestAnimationFrame(draw);
        };


        function drawDrop(drop, tm, ctx, grd) {
            var r = ((tm - drop.start) / drop.speed);
            if (r > (drop.r * 1.5))
                return true;

            drop.x += drop.vx;
            drop.y += drop.vy;
            if (drop.x < 0 || drop.x > width)
                drop.vx = -drop.vx;
            if (drop.y < 0 || drop.y > height)
                drop.vy = -drop.vy;


            ctx.globalAlpha = Math.max(0, (1 - (r / drop.r))) * .8;
            ctx.strokeStyle = grd;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc((drop.x / width) * canvas.width, (drop.y / height) * canvas.height, r, 0, 2 * Math.PI, true);
            ctx.stroke();
            ctx.lineWidth = 0;
            ctx.fill();
        }


        start();

        function start() {

            for (var i = -10000; i < 0; i += 100)
                updateDrops(i);

            requestAnimationFrame(draw);

            $("canvas").click(function (ev) {
                addDrop = {
                    x: Math.floor((ev.clientX / canvas.width) * width),
                    y: Math.floor((ev.clientY / canvas.height) * height)
                };
            });
        }
    }
}