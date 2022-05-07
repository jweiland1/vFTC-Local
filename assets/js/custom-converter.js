const directions = {
    'frontLeft': 0,
    'frontRight': 1,
    'backLeft': 2,
    'backRight': 3,
    'wobbleActuator': 4
}
const exteralFuncs = {
    "JavaUtil.randomInt":
    [
        `mathRandomInt`,        
        `function mathRandomInt(a, b) {
        if (a > b) {
          // Swap a and b to ensure a is smaller.
          var c = a;
          a = b;
          b = c;
        }
        return Math.floor(Math.random() * (b - a + 1) + a);
      }
      `]
}
var mortorVars = {}
const checkBrackets = (str)=>{
    const openBracket =  (str.match(/{/g) || []).length;
    const closeBracket = (str.match(/}/g) || []).length;
    return openBracket - closeBracket
}
const valueConverter = (str) =>{
    if(str.includes(".isBusy(")){
        let sides = str.split(".isBusy(");
        const varName = sides[0];
        return `motor.isBusy(${directions[varName]})`
    }else if(str.includes(".getTargetPosition(")){
        let sides = str.split(".getTargetPosition(");
        const varName = sides[0];
        return `motor.getProperty(${directions[varName]}, 'TargetPosition')`
    }else if(str.includes(".getCurrentPosition(")){
        let sides = str.split(".getCurrentPosition(");
        const varName = sides[0];
        return `motor.getProperty(${directions[varName]}, 'CurrentPosition')`
    }
    return str
}
const valueChecker = (str)=>{
    if(str.includes("JavaUtil.inListGet(")){
        let sides = str.split("JavaUtil.inListGet(")
        let bracks = 0
        let listValue = ''
        for(var i=0; i<sides[1].length; i ++){
            if(sides[1][i]=="(")bracks++
            else if(sides[1][i]==")")bracks--

            if(bracks<0)break;
            else listValue+=sides[1][i]
        }
        let listValueArr = listValue.split(", ")
        listValueArr = `${listValueArr[0]}[((fieldSetup + 1) - 1)]`
        return str.replaceAll("JavaUtil.inListGet(" + listValue + ")", listValueArr)
    }
    var words = str.split(" ")
    if(words.length>0){
        for(var i=0 ; i < words.length ; i++)
            words[i] = valueConverter(words[i]);                
        return words.join(" ")
    }else 
        return str;
}
const customConvert = (str) =>{
    let result = "";
    if(str.includes('hardwareMap')){
        let sides = str.split(" = ");
        const varName = sides[0];
        mortorVars[varName] = directions[varName];
        return result;
    }
    else if(str.includes('.setDirection')){
        let sides = str.split(".setDirection(")
        const varName = sides[0]
        const value = valueChecker(sides[1].replace('DcMotorSimple.Direction.', '').split(");")[0])
        return `motor.setProperty([${mortorVars[varName]}], 'Direction', ["${value}"]);`;
    }
    else if(str.includes('waitForStart()')){
        return str.replace('waitForStart', 'await linearOpMode.waitForStart');
    }

    else if(str.includes('.setPower(')){
        let sides = str.split(".setPower(")
        const varName = sides[0]
        const value = valueChecker(sides[1].split(");")[0])
        return `motor.setProperty([${mortorVars[varName]}], 'Power', [${value}]);`;
    }
    else if(str.includes('setMode(')){
        let sides = str.split(".setMode(")
        const varName = sides[0]
        const value = valueChecker(sides[1].replace('DcMotor.RunMode.', '').split(");")[0])
        return `motor.setProperty([${mortorVars[varName]}], 'Mode', ["${value}]");`;
    }

    else if(str.includes('setTargetPosition(')){
        let sides = str.split(".setTargetPosition(")
        const varName = sides[0]
        const value =  valueChecker(sides[1].split(");")[0])
        return `motor.setProperty([${mortorVars[varName]}], 'TargetPosition', [${value}]);`;
    }
    
    else if(str.includes('setTargetPositionTolerance(')){
        let sides = str.split(").setTargetPositionTolerance(")
        const varName = sides[0].split("(")[1]
        const value = valueChecker(sides[1].split(");")[0])
        return `motor.setProperty([${mortorVars[varName]}], 'TargetPositionTolerance', [${value}]);`;
    }

    else if(str.includes("if (")){

        let sides = str.split("if (")
        const value = valueChecker(sides[1].split(") {")[0])
        return `if (${value}) {` + sides[1].split(") {")[1];

    }

    else if(str.includes("JavaUtil.createListWith(")){
        let sides = str.split("JavaUtil.createListWith(")
        const value = valueChecker(sides[1].split(");")[0])
        return `${sides[0]}[${value}];`;
    }

    else if(str.includes("GoToPosition(")){
        let sides = str.split("GoToPosition(")
        const value = valueChecker(sides[1].split(");")[0])
        return `${sides[0]} GoToPosition(${value});`;
    }

    else if(str.includes("while (")){
        let sides = str.split("while (")
        const value = valueChecker(sides[1].split(") {")[0])
        return `while (${value}) {` + sides[1].split(") {")[1];
    }

    else if(str.includes("for (")){
        let sides = str.split("for (")
        const value = valueChecker(sides[1].split(") {")[0])
        return `for (${value}) {` + sides[1].split(") {")[1];
    }
    else if(str.includes('sleep')){
        return "await linearOpMode.sleep("+str.split("sleep(")[1];
    }else     
        return str;
}
function convert_2js(javaString) {
    var result = "";
    var jsString = ''
    var brackets = 0
    var funcBlocks = {}
    var funcValues = {}
    var funcName = ''

    try {
        javaString = javaString.replaceAll("DcMotor.class,", "");
        result = javaToJavascript(javaString);
        result = result.replaceAll("this.", "");
        result = result.replaceAll('opModeIsActive', 'linearOpMode.opModeIsActive');
        // document.getElementById("output-field").innerText = result;
        result = result.split('\n');

        for (let i = 1; i < result.length; i++) {
            let lineTxt = result[i].trim();
            brackets += checkBrackets(lineTxt);
            // var 
            if (brackets == 1 && !funcName) {
                funcName = lineTxt.split("(")[0];
                funcBlocks[funcName] = [];
                funcValues[funcName] = lineTxt.split("(")[1].split(") {")[0];
            } else if (brackets > 0) {
                var jsLine = customConvert(lineTxt);
                if (jsLine) funcBlocks[funcName].push(jsLine);
            } else if (brackets == 0 && funcName) {
                funcName = '';
            }
        }
        funcBlocks['runOpMode'] = funcBlocks['runOpMode'].join("\n")            
        funcBlocks['constructor'].map(line=> {
            const varValue = line.split(" = ")
            if(mortorVars[varValue[0]])return false
            jsString += "var " + line + "\n"
        })
        Object.keys(funcBlocks).map(key => {
            if (key === 'constructor' || key === 'runOpMode') return
            funcBlocks['runOpMode'] = funcBlocks['runOpMode'].replaceAll((key + "("), ("await " + key + "("));
            funcBlocks[key] = funcBlocks[key].join("\n");
            jsString += `async function ${key}(${funcValues[key]}) { 
                ${funcBlocks[key]}
            }`
            Object.keys(exteralFuncs).map(funct => {
                if(funcBlocks['runOpMode'].includes(funct)){
                    funcBlocks['runOpMode'] = funcBlocks['runOpMode'].replaceAll(funct, exteralFuncs[funct][0])
                    jsString += exteralFuncs[funct][1]
                }
            })
        })

        jsString += `
        async function runOpMode() {
            ${funcBlocks['runOpMode']}
        }        
        await runOpMode();`

    } catch (e) {
        console.log("parse error : ", e)
        return 'parse error'
    }
    console.log("current branch")
    return jsString

}
