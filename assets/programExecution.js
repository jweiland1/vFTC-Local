//---TempVariable will be replaced by vars.js---
var currentProjectName = "";

//---Sending Data to Unity---
const abortedMsg = "aborted";
localStorage.setItem('startMatch', false);
localStorage.setItem('stopMatch', false);
localStorage.setItem('resetField', false);
localStorage.setItem('playMode', "Autonomous");

//---Prompts---
var overlayReturned = null;

//Overrides Window.Prompt for Variable Renaming
window.prompt = function overlayPrompt(message, placeholder) {
	overlayReturned = null;
	overlay(true, (message == "New variable name:" ? 2 : 3));
	return new Promise(function (resolve, reject) {
		var returnChecker = setInterval(function () {
			if (overlayReturned == -1) {
				reject();
				clearInterval(returnChecker);
			} else if (overlayReturned != null) {
				resolve(overlayReturned);
				clearInterval(returnChecker);
			}
		}, 250);
	});
}

//---Gamepad Connections---
window.addEventListener("gamepadconnected", (event) => {
	if (event.gamepad.index < 2) {
		document.getElementById("telemetryText").innerText = 'New Controller: "' + event.gamepad.id + '".\nSet Controller to gamepad' + (event.gamepad.index + 1) + ".";
	}
});

window.addEventListener("gamepaddisconnected", (event) => {
	if (event.gamepad.index < 2) {
		document.getElementById("telemetryText").innerText = 'Controller disconnected: "' + event.gamepad.id + '".\nGamepad' + (event.gamepad.index + 1) + " lost.";
	}
});

//---Functions for OnBotJava---
function getSelectedRange() {
    return {
        from: editor.getCursor(true),
        to: editor.getCursor(false)
    };
}

function autoFormatSelection() {
    var cursor = editor.getCursor();
    CodeMirror.commands["selectAll"](editor);
    var range = getSelectedRange();
    editor.autoFormatRange(range.from, range.to);
    editor.setCursor(cursor);
}

//---Switching between Blocks and Java---
var isUsingBlocks = true;

function switchToBlocks() {
    document.getElementById('blocksBttn').classList.add('button1Selected');
    document.getElementById('javaBttn').classList.remove('button1Selected');

    document.getElementById('blocklyDiv').hidden = false;
    document.getElementById('onBotJavaDiv').hidden = true;
    document.getElementById('saveAs').disabled = false;
    document.getElementById('initBttn').disabled = false;
    isUsingBlocks = true;
    if (Blockly.mainWorkspace)
        Blockly.svgResize(Blockly.mainWorkspace);
    if (currentProjectName != 'program') {
        document.getElementById('save').disabled = false;
        document.getElementById('delete').disabled = false;
        document.getElementById('download').disabled = false;
        document.getElementById("programSelect").value = currentProjectName;
    }
}

function switchToOnBotJava() {
    document.getElementById('javaBttn').classList.add('button1Selected');
    document.getElementById('blocksBttn').classList.remove('button1Selected');

    resetProgramExecution();
    document.getElementById('blocklyDiv').hidden = true;
    document.getElementById('onBotJavaDiv').hidden = false;
    document.getElementById('saveAs').disabled = true;
    document.getElementById('initBttn').disabled = true;
    document.getElementById('save').disabled = true;
    document.getElementById('delete').disabled = true;
    document.getElementById('download').disabled = true;
    isUsingBlocks = false;
    document.getElementById("programSelect").value = "Load Program";
}

var defaultText = 'package org.firstinspires.ftc.teamcode;\n\n\npublic class NewProgram {\n\n	// todo: write your code here\n}';
var editor;

setUpOnBotJava();
switchToBlocks();

function setUpOnBotJava(javaCode) {
    editor = CodeMirror(function (elt) {
        document.getElementById('onBotJavaDiv').replaceChild(elt, document.getElementById('onBotJavaDiv').firstElementChild);
    }, {
        value: "/**\n * OnBotJava is still WIP!\n * You can only visualize Block Code exported to Java\n * and some Sample Code given in the 'New Program' popup.\n */\n\n" + (javaCode || defaultText),
        mode: "text/x-java",
        lineNumbers: true,
        theme: "darcula",
        scrollbarStyle: null,
        autocorrect: true,
        autoCloseBrackets: true,
    });
    //autoFormatSelection();
}

function convert2JS() {
    // console.log("java code : ", editor.getValue())    
    var javaString = editor.getValue()
    let result = ""
    try{
        result = javaToJavascript(javaString)
    }catch(e){
        console.log("parse error : ", e)
    }
    console.log("js code : ",result)
    editor.setValue(result)
}

//---Functionality for New Program Overlay Buttons---
//"Sample Program"
function sampleProgram(blockProgram) {
    var sampleProgram;
	if (typeof blockProgram == "string")
		sampleProgram = blockProgram;
    else if (blockProgram)
        sampleProgram = document.getElementById('blockSelect').value;
    else
        sampleProgram = document.getElementById('javaSelect').value;
    document.getElementById("programSelect").value = "Load Program";
    currentProjectName = "program";
    document.getElementById('save').disabled = true;
    document.getElementById('delete').disabled = true;
    document.getElementById('download').disabled = true;
    //Load Basic Program From Files
    var client = new XMLHttpRequest();
    client.open('GET', './blocks/samples/' + sampleProgram + (blockProgram ? '.blk' : '.java'));
    client.onload = function () {
        var content = client.responseText;
        if (content !== '') {
            if (blockProgram) {
                var i = content.indexOf('</xml>');
                content = content.substring(0, i + 6);
                Blockly.mainWorkspace.clear();
                Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(content), workspace);
                resetProgramExecution();
				if (currStep == 0) {
					if (sampleProgram != 'BasicAutoOpMode')
						document.getElementById("telemetryText").innerText = 'Loaded Example \"' + sampleProgram + '\" Program \n';
					else if (document.getElementById("telemetryText").innerText != '-Telemetry Output-' && !document.getElementById("telemetryText").innerText.startsWith("New Controller"))
						document.getElementById("telemetryText").innerText = 'Reset Blocks \n';
				}
                switchToBlocks();
            } else {
                switchToOnBotJava();
                setUpOnBotJava(content);
            }
        }
    }
    client.send();
    overlay(false, 0);
}

//"Upload Program"
document.getElementById('filePrompt').addEventListener('change', function () {
    var fileReader = new FileReader();
    fileReader.onload = function () {
        uploadProgram(document.getElementById('filePrompt').files[0].name, fileReader.result);
    }
    fileReader.readAsText(document.getElementById('filePrompt').files[0]);
});

function uploadProgram(programName, content) {
    document.getElementById('filePrompt').value = '';
    var fileType = programName.split('.')[programName.split('.').length - 1]
        if (fileType == "blk") {
            programName = programName.substring(0, programName.length - fileType.length - 1);
            currentProjectName = programName;
            Blockly.mainWorkspace.clear();
            var i = content.indexOf('</xml>');
            content = content.substring(0, i + 6); //Convert from names to config
            //String to XML to Blockly
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(blocklyNaming(content), "text/xml");
            //Convert 2 Duals to Quad
            var blocks = xmlDoc.getElementsByTagName("block");
            for (var i = 0; i < blocks.length - 1; i++) {
                if (blocks[i].getElementsByTagName("next")[0]) {
					for (var c = 0; c < blocks[i].getElementsByTagName("next")[0].childNodes.length; c++)
						if (blocks[i].getElementsByTagName("next")[0].childNodes[c].tagName == "block")
							nextBlock = blocks[i].getElementsByTagName("next")[0].childNodes[c];
                    if (blocks[i].getAttribute("type").startsWith("dcMotor_setDualProperty") && nextBlock.getAttribute("type").startsWith("dcMotor_setDualProperty") &&
                        blocks[i].getElementsByTagName("field")[0].childNodes[0].nodeValue == nextBlock.getElementsByTagName("field")[0].childNodes[0].nodeValue) {
                        blocks[i].setAttribute("type", "dcMotor_setQuadProperty" + blocks[i].getAttribute("type").substring(23));
                        for (var c = nextBlock.childNodes.length - 1; c > 1; c--)
                            if (nextBlock.childNodes[c].tagName && nextBlock.childNodes[c].getAttribute("name")) {
                                var num = parseInt(nextBlock.childNodes[c].getAttribute("name").substring(nextBlock.childNodes[c].getAttribute("name").length - 1));
                                nextBlock.childNodes[c].setAttribute("name", nextBlock.childNodes[c].getAttribute("name").substring(0, nextBlock.childNodes[c].getAttribute("name").length - 1) + (num + 2));
                                blocks[i].appendChild(nextBlock.childNodes[c]);
                            }
                        blocks[i].removeChild(blocks[i].getElementsByTagName("next")[0]);
                        if (nextBlock.getElementsByTagName("next")[0])
                            blocks[i].appendChild(nextBlock.getElementsByTagName("next")[0]);
                    }
                }
            }
            content = new XMLSerializer().serializeToString(xmlDoc);
            console.log(content);
            Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(content), workspace);
            resetProgramExecution();
            document.getElementById("telemetryText").innerText = 'Loaded new \"' + programName + '\" Program \n';
            localStorage.setItem("Program Name: " + programName, content);
            prepareUiToLoadProgram();
            document.getElementById("programSelect").value = programName;
            document.getElementById('save').disabled = false;
            document.getElementById('delete').disabled = false;
            document.getElementById('download').disabled = false;
            switchToBlocks();
            overlay(false, 0);
        } else if (fileType == "java") {
            switchToOnBotJava();
            setUpOnBotJava(content);
            overlay(false, 0);
        }
}

//"Export to OnBotJava"
function convertToJava() {
    var javaCode = generateJavaCode();
    switchToOnBotJava();
    setUpOnBotJava(configNaming(javaCode));
    overlay(false, 0);
}

//Coped from FTC Code
function generateJavaCode() {
    // Get the blocks as xml (text).
    Blockly.FtcJava.setClassNameForFtcJava_((currentProjectName != "program") ? currentProjectName : null);
    var blocksContent = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
    // Don't bother exporting if there are no blocks.
    if (blocksContent.indexOf('<block') > -1) {
        // Generate Java code.
        return Blockly.FtcJava.workspaceToCode(workspace);
    }
    return '';
}

//---Functionality of Middle Buttons---
function saveProgram() {
    var programName = document.getElementById('saveProgramName').value;
    var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    localStorage.setItem("Program Name: " + programName, Blockly.Xml.domToText(xml));
    prepareUiToLoadProgram();
    document.getElementById("programSelect").value = document.getElementById('saveProgramName').value;
    currentProjectName = document.getElementById('saveProgramName').value;
    document.getElementById('save').disabled = false;
    document.getElementById('delete').disabled = false;
    document.getElementById('download').disabled = false;
    overlay(false, 0);
    document.getElementById("telemetryText").innerText = 'Saved new "' + programName + '" Program \n';
	//HowTo Tutorial Addition
	if (currStep > 0) {
		document.getElementById('howToText').children[2].children[1].disabled = false;
		document.getElementById('saveAs').style.position = "inherit";
		document.getElementById('saveAs').style.zIndex = "inherit";
	}
}

function loadProgram() {
    Blockly.mainWorkspace.clear();
    var nameOfProject = "Program Name: " + document.getElementById("programSelect").value;
    currentProjectName = document.getElementById('programSelect').value;
    if (nameOfProject == "Program Name: Load Program") {
        document.getElementById("blockSelect").value = 'BasicAutoOpMode';
        sampleProgram(true);
    } else if (typeof(Storage) !== "undefined") {
        document.getElementById('save').disabled = false;
        document.getElementById('delete').disabled = false;
        document.getElementById('download').disabled = false;
        var xml = Blockly.Xml.textToDom(localStorage.getItem(nameOfProject));
        Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
        resetProgramExecution();
        document.getElementById("telemetryText").innerText = 'Loaded "' + document.getElementById("programSelect").value + '" Program \n';
    }
    switchToBlocks();
}

function autoSave() {
    var programName = document.getElementById('programSelect').value;
    var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    localStorage.setItem("Program Name: " + programName, Blockly.Xml.domToText(xml));
    document.getElementById("telemetryText").innerText = 'Saved "' + programName + '" Program \n';
}

function deleteProgram() {
    var programName = document.getElementById('programSelect').value;
    currentProjectName = "program";
    localStorage.removeItem("Program Name: " + programName);
    document.getElementById("blockSelect").value = 'BasicAutoOpMode';
    sampleProgram(true);
    prepareUiToLoadProgram();
    resetProgramExecution();
    document.getElementById("telemetryText").innerText = 'Deleted "' + programName + '" Program \n';
    overlay(false, 0);
}

function downloadProgram(button) {
    var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    //Blockly to XML to String
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(configNaming(Blockly.Xml.domToText(xml)), "text/xml");
    //Convert Quad to 2 Duals
    var blocks = xmlDoc.getElementsByTagName("block");
    for (var i = 0; i < blocks.length; i++)
        if (blocks[i].getAttribute("type").startsWith("dcMotor_setQuadProperty")) {
            var secondDual = blocks[i].cloneNode();
            blocks[i].setAttribute("type", "dcMotor_setDualProperty" + blocks[i].getAttribute("type").substring(23));
            secondDual.setAttribute("type", blocks[i].getAttribute("type"));
            secondDual.appendChild(blocks[i].childNodes[0].cloneNode(true));
            for (var c = blocks[i].childNodes.length - 1; c > 0; c--)
                if (blocks[i].childNodes[c].getAttribute("name")) {
                    var num = parseInt(blocks[i].childNodes[c].getAttribute("name").substring(blocks[i].childNodes[c].getAttribute("name").length - 1));
                    if (num > 2) {
                        blocks[i].childNodes[c].setAttribute("name", blocks[i].childNodes[c].getAttribute("name").substring(0, blocks[i].childNodes[c].getAttribute("name").length - 1) + (num - 2));
                        secondDual.appendChild(blocks[i].childNodes[c]);
                    }
                }
            if (blocks[i].getElementsByTagName("next")[0])
                secondDual.appendChild(blocks[i].getElementsByTagName("next")[0]);
            blocks[i].appendChild(xmlDoc.createElement("next"));
            blocks[i].getElementsByTagName("next")[0].appendChild(secondDual);
        }
    //Download Program
    button.parentElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(xmlDoc).replace(/xmlns=\"(.*?)\"/g, '')));
    button.parentElement.setAttribute('download', document.getElementById('programSelect').value + ".blk");
}

//---Functionality for Top Right Buttons---
function initProgram(code) {
    resetProgramExecution();
    programStart = false;
    document.getElementById('programInit').style.display = 'none';
    document.getElementById('programStartStop').style.display = 'inline-block';
    document.getElementById('startBttn').disabled = false;
    startTime = performance.now();
    if (code == "") {
        code = Blockly.JavaScript.workspaceToCode(Blockly.mainWorkspace);
        var finalCode = "";
        var inFunction = false;
        for (var line of code.split('\n')) {
            if (line.startsWith('function ')) {
                inFunction = true;
            }
            if (line.startsWith('async function '))
                inFunction = true;
            if (inFunction || line == '' || line.startsWith('var ') || line.startsWith('// '))
                finalCode += line + '\n';
            else
                finalCode += '//' + line + '\n';
            if (line == '}')
                inFunction = false;
        }

        finalCode += "\nawait runOpMode();\n";
        runProgram(finalCode);
    } else
        runProgram(code);
}

function startProgram() {
    document.getElementById('startBttn').disabled = true;
	//HowTo Tutorial Thing
	if (currStep == 2) {
		document.getElementById('howToText').children[2].children[1].disabled = false;
		document.getElementById('programInit').style.position = "inherit";
		document.getElementById('programInit').style.zIndex = "inherit";
		document.getElementById('programStartStop').style.position = "inherit";
		document.getElementById('programStartStop').style.zIndex = "inherit";
	}
	else
		programStart = true;
    document.getElementById("telemetryText").innerText = "Program Started \n";
}

function stopProgram() {
    localStorage.setItem('stopMatch', true);
    resetProgramExecution();
    document.getElementById("telemetryText").innerText = "Program Aborted \n";
}

function resetField() {
    localStorage.setItem('resetField', true);
    document.getElementById("telemetryText").innerText = "Field Reset \n";
}

//---Funcionality for Running Blockly Code---
var programExecController = new AbortController();

async function runProgram(code) {
    console.log(code);
    let AsyncFunctionCtor = Object.getPrototypeOf(async function () {}).constructor;
    let program = new AsyncFunctionCtor(code);

    //setup
    localStorage.setItem('startMatch', true);
    document.getElementById("telemetryText").innerText = "Program Initialized \n";

    programExecController = new AbortController();
    // execution
    try {
        await program();
    } catch (err) {
        // anything other than abortedMsg is an actual error
        if (err != abortedMsg) {
            localStorage.setItem('stopMatch', true);
            document.getElementById("telemetryText").innerText = "<Program has stopped!>\n" + err;
            resetProgramExecution();
            throw err;
        }
    }

    // end
    resetProperties();
    localStorage.setItem('stopMatch', true);
    if (!document.getElementById("telemetryText").innerText.startsWith("<Program has stopped!>"))
        document.getElementById("telemetryText").innerText = "Program Ended \n";
    document.getElementById('programInit').style.display = 'inline-block';
    document.getElementById('programStartStop').style.display = 'none';
}

function resetProgramExecution() {
    programExecController.abort();
    resetProperties();
    document.getElementById('programInit').style.display = 'inline-block';
    document.getElementById('programStartStop').style.display = 'none';
}