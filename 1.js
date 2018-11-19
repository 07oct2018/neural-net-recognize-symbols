#!/usr/bin/env node
'use strict'
let fs = require('fs');
let convnetjs = require('./convnet-min.js');

function prepareData(data) {
  return data
    .replace(/\n(?=[^\n])/g,"")
    .split("\n")
    .map( el => 
      el.split("")
      .map( el2 =>
        parseInt(el2)
      )
    ).filter( el =>
      el.length != 0
    )
    .map( el => 
      new convnetjs.Vol(el)
    )
}

let createRange = function(no) {
  return Array.from(Array(no)).map( (x,n) => n);
}

function foldList(list,length) {
  return createRange( list.length )
    .filter(el =>
      el % length == 0
    ).map(el => 
      list.slice(el,el+length)
    )
}

Array.prototype.fold = function(length) {
  return createRange( this.length )
    .filter(el =>
      el % length == 0
    ).map(el => 
      this.slice(el,el+length)
    )
}

function presentDataItem(dataItem) {
  return foldList(dataItem.w,5)
    .map( el =>
      el.join("")
    ).join("\n")
    .replace(/0/g,".")
    .replace(/1/g,"#")
}

Array.prototype.transpose = function() {
  return this[0].map((col, i) => this.map(row => row[i]));
}

function presentData(data){
  return data
    .map( el =>
      presentDataItem(el)
      .split("\n")
   ).transpose()
    .map( el => 
      el.join("\t")
   ).join("\n")

}

function printUsage() {
  console.log(`
  Usage:
  ${process.argv[1]} train trainingdata.txt training_cycles
  ${process.argv[1]} recognize data.txt 
  `)
}

function taggedMax(a) {
  return a.reduce(
        ( (a,c,i) => a.value < c ? {value:c,index:[i]} : a ),
          {value:-1/0,index:[-1]}
      )

}

let class_to_symbol = ['Г','К','С','0','2']

function main() {
  let net = new convnetjs.Net();
  switch(process.argv[2]) {
    case 'train':
      console.log('Обучающее множество ',process.argv[3]);
      let rawTrainingData = fs.readFileSync(process.argv[3],'utf-8');
      let trainingCycles = parseInt(process.argv[4]);
      let trainingData = prepareData(rawTrainingData);

      net.makeLayers([
        {type:'input', out_sx:1, out_sy:1, out_depth:35},
        {type:'softmax', num_classes:5}
      ]);

      let trainer = new convnetjs.Trainer(net);
      createRange(500).map( x => 
        createRange(trainingData.length).map( el =>
          trainer.train(trainingData[el], el % 5) ));
      console.log(presentData(trainingData));
      fs.writeFileSync("network.json",JSON.stringify(net.toJSON(),null,"  "));
      break;
    case 'recognize':
      let rawTestData = fs.readFileSync(process.argv[3],'utf-8');
      let testData = prepareData(rawTestData);
      net.fromJSON(JSON.parse(fs.readFileSync("network.json",'utf-8')));
      testData.map( testDataItem => {
        console.log(presentDataItem(testDataItem))
        let recog_results = taggedMax(net.forward(testDataItem).w);
        console.log("Символ: ",class_to_symbol[recog_results.index],"Вероятность:",recog_results.value)
      }
      )
      break;
    default:
      printUsage();
      break;
  }
}

main();
