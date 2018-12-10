
let fs = require('fs');

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
    ).map( el => 
    [1].concat(el)
    )
    /*.map( el => 
      new convnetjs.Vol(el)
    )*/
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
  return foldList(dataItem.slice(1),5)
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
  ${process.argv[1]} train trainingdata.txt 
  ${process.argv[1]} recognize data.txt 
  `)
}

function taggedMax(a) {
  return a.reduce(
        ( (a,c,i) => a.value < c ? {value:c,index:[i]} : a ),
          {value:-1/0,index:[-1]}
      )

}

function presentWeights(weights) {
  return weights
    .map( el => 
      el.map( el2 =>
        el2.toString().padStart(2)
      ).join(" ")
    ).join("\n")
}

let class_to_symbol = ['Г','К','С','0','2']

function neuronResult(neuron, dataItem) {
  return (neuron.reduce( ( (acc, weight, no) =>
    acc + weight * dataItem[no]
  ),0 ) >= neuron[0]) === true ? 1 : 0;
}

function recogResultRaw(net, dataItem) {
  return net.map(neuron => neuronResult(neuron,dataItem))
}

function recogResult(net, dataItem, label) {
  let recogResult = recogResultRaw(net,dataItem);
  if (recogResult.filter( el => el === 1).length===1 &&
      recogResult.filter( el => el !== 1).length===4)
    if (recogResult.indexOf(1) === label)
      return recogResult.toString()
        .concat(" - ")
        .concat(class_to_symbol[recogResult.indexOf(1)])
        .concat(" (Распознан верно)")
    else 
      return recogResult.toString()
        .concat(" - ")
        .concat(class_to_symbol[recogResult.indexOf(1)])
        .concat(" (Ожидаемый ответ - ")
        .concat(class_to_symbol[label])
        .concat(" )")
  else
    return recogResult.toString()
      .concat(" - ")
      .concat("Образ не распознан")
}


function main() {

  switch(process.argv[2]) {
    case 'train': {
      var netWeights = Array.from(Array(5)).map( el =>
        Array.from(Array(36)).map( el2 =>
          0
        )
      )
      const rawTrainingData = fs.readFileSync(process.argv[3],'utf-8');
      const trainingData = prepareData(rawTrainingData)
      console.log(presentData(trainingData))
      //dataItem = trainingData[0];
      let runNo = 0;
      let trainingDone = true;
      do {
        trainingDone = true;
        runNo +=1;
        console.log("\nЦикл обучения",runNo,". Распознавание обучающего множества:");
        trainingData.map( ( dataItem, dataIndex ) => {
          console.log(recogResult(netWeights,dataItem,dataIndex % 5));
          netWeights = netWeights.map( (neuron, neuronNo) => {
            let result = neuronResult(neuron,dataItem)
            let delta = (neuronNo === ( dataIndex % 5 ) ? 1 : 0) - result;
            if (delta != 0) {trainingDone = false};
            return neuron.map( (weight, weightNo) => 
              weight + dataItem[weightNo]*delta
            ) 
          })
        }) 
        console.log("Веса после",runNo,"цикла обучения:");
        console.log(presentWeights(netWeights))
      } while (trainingDone == false)
      console.log("Обучение закончено.");
      fs.writeFileSync("network.json",JSON.stringify(netWeights),'utf-8');
      break;
    }
    case 'recognize':{
      const netWeights=JSON.parse(fs.readFileSync("network.json",'utf-8'));
      console.log(presentWeights(netWeights))
      const rawTrainingData = fs.readFileSync(process.argv[3],'utf-8');
      const trainingData = prepareData(rawTrainingData)
      trainingData.map( ( dataItem, dataIndex ) => {
        console.log(recogResult(netWeights,dataItem,dataIndex % 5));
      })
      break;
    }
    default: {
      printUsage()
      break;
    }
  }
}

main()
