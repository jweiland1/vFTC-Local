
const directions = {
    'frontLeft': 0,
    'frontRight': 1,
    'backLeft': 2,
    'backRight': 3,
    'ringCollection': 4,
    'ringLoader': 5,
    'ringShooter': 6,
    'wobbleActuator': 7
}

const removeWordsJAVA = [
    "DcMotor.class,", "ColorSensor.class,", "(Double)", ".doubleValue()", ".toString()", "Double.parseDouble", "(DistanceSensor)"
]

const replaceJSString = [
    ["DistanceUnit.CM", "'CM'"], ["this.", ""], ['opModeIsActive', 'linearOpMode.opModeIsActive']
]


const colorData = {
    'bottomColorSensor': 0
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
var colorVars = {}
var convertedSource = ""
const checkBrackets = (str)=>{
    const openBracket =  (str.match(/{/g) || []).length;
    const closeBracket = (str.match(/}/g) || []).length;
    return openBracket - closeBracket
}


const getBracketContent = (str)=>{
    let returnStr = ""
    let bracketCount = 0

    for(var i=0; i<str.length; i++){
        if(str[i]=="(")bracketCount++
        else if(str[i]==")")bracketCount--
        if(bracketCount<0)break
        returnStr +=str[i]
    }

    return returnStr

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
    }else if(str.includes(".blue()")){
        let sides = str.split(".blue()");
        const varName = sides[0];
        return `colorSensor.getColor(${colorVars[varName]}, 'Blue')` 
    }else if(str.includes(".red()")){
        let sides = str.split(".red()");
        const varName = sides[0];
        return `colorSensor.getColor(${colorVars[varName]}, 'Red')` 
    }else if(str.includes(".green()")){
        let sides = str.split(".green()");
        const varName = sides[0];
        return `colorSensor.getColor(${colorVars[varName]}, 'Green')` 
    }else if(str.includes("getRuntime(")){
        return str.replaceAll('getRuntime(', "linearOpMode.getRuntime(")
    }else if(str.includes(".getDistance(")){
        let sides = str.split(".getDistance(")
        let colorIndex = 0
        Object.keys(colorData).map((color)=>{
            if(sides[0].includes(color))colorIndex=color
        })

        let value = getBracketContent(sides[1])
        return `colorSensor.getDistance(${colorData[colorIndex]}, ${value})`;
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

        console.log("listValue update: ", listValue)
        let listValueArr = listValue.split(", ")
        listValueArr = `${listValueArr[0]}[${listValueArr[2]}]`

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
    // let result = "";

    if(str.includes('hardwareMap.get')){
        let sides = str.split(" = ");
        const varName = sides[0];
        console.log("var value sides[1] : ", sides)
        const varValue = sides[1].split("hardwareMap.get('")[1].split("')")[0]
        if(directions[varValue]!=undefined)
            mortorVars[varName] = directions[varValue];
        else if(colorData[varValue]!=undefined)
            colorVars[varName] = colorData[varValue];
        return "";
    }
    else if(str.includes('.setDirection')){
        let sides = str.split(".setDirection(")
        const varName = sides[0]
        const value = valueChecker(sides[1].replace('DcMotorSimple.Direction.', '').split(");")[0])
        return `motor.setProperty([${mortorVars[varName]}], 'Direction', ['${value}']);`;
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
        return `motor.setProperty([${mortorVars[varName]}], 'Mode', ['${value}']);`;
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
    }else if(str.includes("telemetry.addData(")){


        let sides = str.split("telemetry.addData(")[1].split(");")[0]
        // .split(" ")
        let bracketCount = 0
        let s = 0
        for(s=0; s<sides.length; s++){
            if(sides[s]=='(')bracketCount++
            else if(sides[s]==')')bracketCount--
            if(bracketCount==0 && sides[s] == ',') break;
        }

        sides = [sides.substring(0, s), sides.substring(s+2, sides.length)]

        let newVars = []

        sides.map(item=>{
            newVars.push(valueChecker(item))
        })
        newVars = newVars.join(", ")

        return `telemetry.addData(${newVars});`
    }
    else if(str.includes('sleep')){
        return "await linearOpMode.sleep("+str.split("sleep(")[1];
    }else     
        return valueChecker(str);
}
function convert_2js(javaString) {
    var result = "";
    var jsString = ''
    var brackets = 0
    var funcBlocks = {}
    var funcValues = {}
    var funcName = ''

    try {

        var classString1 =  javaString.split("extends LinearOpMode")
        var classString2 = classString1[0].split("@TeleOp(")
        var classString3 = classString2[1].split("public class ")

        javaString = classString2[0] + "@TeleOp(" + (classString3[0] + "public class MainControlClass extends LinearOpMode") +classString1[1]

        removeWordsJAVA.map(word=>{
            javaString = javaString.replaceAll(word, "")
        })

        result = javaToJavascript(javaString);

        replaceJSString.map(word=>{
            result = result.replaceAll(word[0], word[1])
        })

     

        convertedSource = result

        result = result.split('\n');
        

        for (let i = 1; i < result.length; i++) {            
            let space_letter = ""
            for(var j=0;i<result[i].length;j++)if(result[i][j]!==" ")break; else space_letter += " ";

            let lineTxt = result[i].trim();
            brackets += checkBrackets(lineTxt);
            // var 
            if (brackets == 1 && !funcName) {
                funcName = lineTxt.split("(")[0];
                funcBlocks[funcName] = [];
                funcValues[funcName] = lineTxt.split("(")[1].split(") {")[0];
            } else if (brackets > 0) {
                var jsLine = customConvert(lineTxt);
                if (jsLine != "") funcBlocks[funcName].push(space_letter + jsLine);
            } else if (brackets == 0 && funcName) {
                funcName = '';
            }
        }

        console.log("Vars : ", mortorVars, colorVars, funcBlocks)
        funcBlocks['runOpMode'] = funcBlocks['runOpMode'].join("\n")            
        funcBlocks['constructor'].map(line=> {
            const varValue = line.trim().split(" = ")
            if(mortorVars[varValue[0]]!=undefined || colorVars[varValue[0]]!=undefined)return false

            jsString += "var " + line + "\n"
        })
        Object.keys(funcBlocks).map(key => {
            if (key === 'constructor' || key === 'runOpMode') return
            funcBlocks['runOpMode'] = funcBlocks['runOpMode'].replaceAll((key + "("), ("await " + key + "("));
            funcBlocks[key] = funcBlocks[key].join("\n");
            jsString += `async function ${key}(${funcValues[key]}) { 
                ${funcBlocks[key]}
            }\n`
            Object.keys(exteralFuncs).map(funct => {
                if(funcBlocks['runOpMode'].includes(funct)){
                    funcBlocks['runOpMode'] = funcBlocks['runOpMode'].replaceAll(funct, exteralFuncs[funct][0])
                    jsString += exteralFuncs[funct][1] + "\n"
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

    return jsString

}
