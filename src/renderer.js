const remote = require("@electron/remote");
const { ipcRenderer, dialog } = require("electron");

const win = remote.getCurrentWindow();

//Choosing model and handle exceptions

document.onreadystatechange = (event) => {
    ipcRenderer.send("os");
    if (document.readyState === "complete") {
        handleWindowControls();
        setupDialogHandlers();
    }
    document.querySelector(".secondary").style.display = "none";
    document.querySelector(".dialog-title h3").innerText = "Couldn't load model";
    ipcRenderer.send("checkModelPath");
};

ipcRenderer.on("os", (_error, { data }) => {
    document.querySelector("html").classList.add(data);
});

ipcRenderer.on("modelPathValid", (_event, { data }) => {
	if (data) {
		ipcRenderer.send("startChat");
	} else {
		ipcRenderer.send("getCurrentModel");
		document.getElementById("path-dialog-bg").classList.remove("hidden");
	}
});

function setupDialogHandlers() {
	// Change model button
	document.getElementById('change-model').addEventListener('click', () => {
		document.getElementById('path-dialog-bg').classList.remove('hidden');
	});

	// Dialog buttons
	const dialogButtons = document.querySelectorAll('#path-dialog-bg button');
	dialogButtons.forEach(button => {
		if (button.classList.contains('btn-primary') && !button.classList.contains('browse')) {
			// Confirm button
			button.addEventListener('click', () => {
				const path = document.querySelector("#path-dialog input[type=text]").value.replaceAll('"', "");
				ipcRenderer.send("checkPath", { data: path });
			});
		} else if (button.classList.contains('btn-secondary')) {
			// Cancel button
			button.addEventListener('click', () => {
				document.getElementById('path-dialog-bg').classList.add('hidden');
			});
		} else if (button.classList.contains('btn-primary')) {
			// Browse button
			button.addEventListener('click', () => {
				ipcRenderer.send("pickFile");
			});
		}
	});

	// Input enter key handler
	document.querySelector("#path-dialog input[type=text]").addEventListener("keypress", (e) => {
		if (e.keyCode === 13) {
			e.preventDefault();
			const confirmButton = document.querySelector("#path-dialog-bg button.btn-primary:not(.browse)");
			confirmButton.click();
		}
	});
}

ipcRenderer.on("pathIsValid", (_event, { data }) => {
	console.log(data);
	if (data) {
		document.querySelector("#path-dialog > p.error-text").style.display = "none";
		document.getElementById("path-dialog-bg").classList.add("hidden");
		ipcRenderer.send("restart");
	} else {
		document.querySelector("#path-dialog > p.error-text").style.display = "block";
	}
});

ipcRenderer.on("pickedFile", (_error, { data }) => {
	document.querySelector("#path-dialog input[type=text]").value = data;
});

ipcRenderer.on("currentModel", (_event, { data }) => {
	document.querySelector("#path-dialog input[type=text]").value = data;
});

window.onbeforeunload = (event) => {
	win.removeAllListeners();
};

//Handle window controls

function handleWindowControls() {
	document.getElementById("min-button").addEventListener("click", (event) => {
		win.minimize();
	});

	document.getElementById("max-button").addEventListener("click", (event) => {
		win.maximize();
	});

	document.getElementById("restore-button").addEventListener("click", (event) => {
		win.unmaximize();
	});

	document.getElementById("close-button").addEventListener("click", (event) => {
		win.close();
	});

	toggleMaxRestoreButtons();
	win.on("maximize", toggleMaxRestoreButtons);
	win.on("unmaximize", toggleMaxRestoreButtons);

	function toggleMaxRestoreButtons() {
		if (win.isMaximized()) {
			document.body.classList.add("maximized");
		} else {
			document.body.classList.remove("maximized");
		}
	}
}

var gen = 0;
const form = document.getElementById("form");
const stopButton = document.getElementById("stop");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

input.addEventListener("keydown", () => {
	setTimeout(() => {
		input.style.height = "auto";
		input.style.height = input.scrollHeight + "px";
	});
});
input.addEventListener("keyup", () => {
	setTimeout(() => {
		input.style.height = "auto";
		input.style.height = input.scrollHeight + "px";
	});
});

let isRunningModel = false;
const loading = (on) => {
	if (on) {
		document.querySelector(".loading").classList.remove("hidden");
	} else {
		document.querySelector(".loading").classList.add("hidden");
	}
};

form.addEventListener("submit", (e) => {
	e.preventDefault();
	e.stopPropagation();
	if (form.classList.contains("running-model")) return;
	if (input.value) {
		var prompt = input.value.replaceAll("\n", "\\n");
		ipcRenderer.send("message", { data: prompt });
		say(input.value, `user${gen}`, true);
		loading(prompt);
		input.value = "";
		isRunningModel = true;
		stopButton.removeAttribute("disabled");
		form.setAttribute("class", isRunningModel ? "running-model" : "");
		gen++;
		setTimeout(() => {
			input.style.height = "auto";
			input.style.height = input.scrollHeight + "px";
		});
	}
});
input.addEventListener("keydown", (e) => {
	if (e.keyCode === 13) {
		e.preventDefault();
		if (e.shiftKey) {
			document.execCommand("insertLineBreak");
		} else {
			form.requestSubmit();
		}
	}
});

stopButton.addEventListener("click", (e) => {
	e.preventDefault();
	e.stopPropagation();
	ipcRenderer.send("stopGeneration");
	stopButton.setAttribute("disabled", "true");
	setTimeout(() => {
		isRunningModel = false;
		form.setAttribute("class", isRunningModel ? "running-model" : "");
		input.style.height = "34px";
	}, 5);
});

const sha256 = async (input) => {
	const textAsBuffer = new TextEncoder().encode(input);
	const hashBuffer = await window.crypto.subtle.digest("SHA-256", textAsBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hash = hashArray.map((item) => item.toString(16).padStart(2, "0")).join("");
	return hash;
};
const say = (msg, id, isUser) => {
	let item = document.createElement("li");
	if (id) item.setAttribute("data-id", id);
	item.classList.add(isUser ? "user-msg" : "bot-msg"); 
	console.log(msg);

	//escape html tag
	if (isUser) {
		msg = msg.replaceAll(/</g, "&lt;");
		msg = msg.replaceAll(/>/g, "&gt;");
	}

	item.innerHTML = msg;
	if (document.getElementById("bottom").getBoundingClientRect().y - 40 < window.innerHeight) {
		setTimeout(() => {
			bottom.scrollIntoView({ behavior: "smooth", block: "end" });
		}, 100);
	}
	messages.append(item);
};
var responses = [];

Date.prototype.timeNow = function () {
	return (this.getHours() < 10 ? "0" : "") + this.getHours() + ":" + (this.getMinutes() < 10 ? "0" : "") + this.getMinutes() + ":" + (this.getSeconds() < 10 ? "0" : "") + this.getSeconds();
};
Date.prototype.today = function () {
	return (this.getDate() < 10 ? "0" : "") + this.getDate() + "/" + (this.getMonth() + 1 < 10 ? "0" : "") + (this.getMonth() + 1) + "/" + this.getFullYear();
};

ipcRenderer.on("result", async (_event, { data }) => {
	var response = data;
	loading(false);
	if (data == "\n\n<end>") {
		setTimeout(() => {
			isRunningModel = false;
			form.setAttribute("class", isRunningModel ? "running-model" : "");
		}, 200);
	} else {
		document.body.classList.remove("llama");
		document.body.classList.remove("alpaca");
		isRunningModel = true;
		form.setAttribute("class", isRunningModel ? "running-model" : "");
		const id = gen;
		let existing = document.querySelector(`[data-id='${id}']`);
		if (existing) {
			if (!responses[id]) {
				responses[id] = document.querySelector(`[data-id='${id}']`).innerHTML;
			}

			responses[id] = responses[id] + response;

			if (responses[id].startsWith("<br>")) {
				responses[id] = responses[id].replace("<br>", "");
			}
			if (responses[id].startsWith("\n")) {
				responses[id] = responses[id].replace("\n", "");
			}

			responses[id] = responses[id].replaceAll(/\r?\n\x1B\[\d+;\d+H./g, "");
			responses[id] = responses[id].replaceAll(/\x08\r?\n?/g, "");

			responses[id] = responses[id].replaceAll("\\t", "&nbsp;&nbsp;&nbsp;&nbsp;"); //tab characters
			responses[id] = responses[id].replaceAll("\\b", "&nbsp;"); //no break space
			responses[id] = responses[id].replaceAll("\\f", "&nbsp;"); //no break space
			responses[id] = responses[id].replaceAll("\\r", "\n"); //sometimes /r is used in codeblocks

			responses[id] = responses[id].replaceAll("\\n", "\n"); //convert line breaks back
			responses[id] = responses[id].replaceAll("\\\n", "\n"); //convert line breaks back
			responses[id] = responses[id].replaceAll('\\\\\\""', '"'); //convert quotes back

			responses[id] = responses[id].replaceAll(/\[name\]/gi, "Llama2");

			//responses[id] = responses[id].replaceAll(/(\d+\..+)/g, "\n&nbsp;&nbsp;&nbsp;&nbsp;$1");
			
			

			responses[id] = responses[id].replaceAll(/(<|\[|#+)((current|local)_)?time(>|\]|#+)/gi, new Date().timeNow());
			responses[id] = responses[id].replaceAll(/(<|\[|#+)(current_)?date(>|\]|#+)/gi, new Date().today());
			responses[id] = responses[id].replaceAll(/(<|\[|#+)day_of_(the_)?week(>|\]|#+)/gi, new Date().toLocaleString("en-us", { weekday: "long" }));

			responses[id] = responses[id].replaceAll(/(<|\[|#+)(current_)?year(>|\]|#+)/gi, new Date().getFullYear());
			responses[id] = responses[id].replaceAll(/(<|\[|#+)(current_)?month(>|\]|#+)/gi, new Date().getMonth() + 1);
			responses[id] = responses[id].replaceAll(/(<|\[|#+)(current_)?day(>|\]|#+)/gi, new Date().getDate());

			//escape html tag
			responses[id] = responses[id].replaceAll(/</g, "&lt;");
			responses[id] = responses[id].replaceAll(/>/g, "&gt;");

			
			// if scroll is within 8px of the bottom, scroll to bottom
			if (document.getElementById("main").getBoundingClientRect().y - 40 < window.innerHeight) {
				setTimeout(() => {
					bottom.scrollIntoView({ behavior: "smooth", block: "end" });
				}, 100);
			}
			existing.innerHTML = responses[id];
		} else {
			say(response, id);
		}
	}
});

//Transfer Examples to Input

document.querySelectorAll("#feed-placeholder-friendlychat .card").forEach((e) => {
	e.addEventListener("click", () => {
		let text = e.innerText.replace('"', "").replace('" →', "");
		input.value = text;
	});
});
document.querySelectorAll("#feed-placeholder-friendlychat .card").forEach((e) => {
	e.addEventListener("click", () => {
		let text = e.innerText.replace('"', "").replace('" →', "");
		input.value = text;
	});
});

//Resources
const cpuText = document.querySelector("#cpu .info");
const ramText = document.querySelector("#ram .info");
const cpuBar = document.querySelector("#cpu .resource-bar-inner");
const ramBar = document.querySelector("#ram .resource-bar-inner");

let cpuCount = 0;
let threadUtilized = 0;
let totalmem = 0;
let cpuPercent = 0;
let freemem = 0;

// Get initial values
ipcRenderer.send("cpuCount");
ipcRenderer.send("threadUtilized");
ipcRenderer.send("totalmem");

// CPU Count listener
ipcRenderer.on("cpuCount", (_event, { data }) => {
    cpuCount = data;
    updateCPUText();
});

// Thread Utilization listener
ipcRenderer.on("threadUtilized", (_event, { data }) => {
    threadUtilized = data;
    updateCPUText();
});

// Total Memory listener
ipcRenderer.on("totalmem", (_event, { data }) => {
    totalmem = Math.round(data / 102.4) / 10;
    updateRAMText();
});

// Update resource info every 1.5 seconds
setInterval(() => {
    ipcRenderer.send("cpuUsage");
    ipcRenderer.send("freemem");
}, 1500);

// CPU Usage listener
ipcRenderer.on("cpuUsage", (_event, { data }) => {
    cpuPercent = Math.round(data * 100);
    updateCPUText();
    updateCPUBar();
});

// Free Memory listener
ipcRenderer.on("freemem", (_event, { data }) => {
    freemem = data;
    updateRAMText();
    updateRAMBar();
});

// Helper functions to update UI
function updateCPUText() {
    cpuText.textContent = `CPU: ${cpuPercent}%, ${threadUtilized}/${cpuCount} threads`;
}

function updateRAMText() {
    const usedMem = Math.round((totalmem - freemem) * 10) / 10;
    ramText.textContent = `RAM: ${usedMem.toFixed(1)}GB/${totalmem.toFixed(1)}GB`;
}

function updateCPUBar() {
    cpuBar.style.transform = `scaleX(${cpuPercent / 100})`;
}

function updateRAMBar() {
    const usageRatio = (totalmem - freemem) / totalmem;
    ramBar.style.transform = `scaleX(${usageRatio})`;
}

document.getElementById("clear").addEventListener("click", () => {
	input.value = "";
	setTimeout(() => {
		input.style.height = "auto";
		input.style.height = input.scrollHeight + "px";
	});
});

//Chat clearing 

document.getElementById("clear-chat").addEventListener("click", () => {
	stopButton.click();
	stopButton.removeAttribute("disabled");
	document.querySelectorAll("#messages li").forEach((element) => {
		element.remove();
	});
	setTimeout(() => {
		document.querySelectorAll("#messages li").forEach((element) => {
			element.remove();
		});
	}, 100);
});

//Model Settings WIP

document.getElementById("change-model").addEventListener("click", () => {
	ipcRenderer.send("getCurrentModel");
	document.querySelector("#path-dialog-bg > div > div.dialog-button > button.secondary").style.display = "";
	document.querySelector("#path-dialog-bg > div > div.dialog-title > h3").innerText = "Change model path";
	document.getElementById("path-dialog-bg").classList.remove("hidden");
});

//Hiding the placeholder when typing

const inputm = document.getElementById('input');
const placeholder = document.getElementById('feed-placeholder-friendlychat');
const clearChatButton = document.getElementById('clear-chat');

inputm.addEventListener('keyup', () => {
	if (inputm.value.trim().length > 0) {
		placeholder.classList.add('hidden');
	} else{
		placeholder.classList.add('hidden');
	}
});

clearChatButton.addEventListener('click', () => {
	placeholder.classList.remove('hidden');
});

// Dropdown Menu
const menuButton = document.getElementById('menu-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const changeModelBtn = document.getElementById('change-model');
const clearChatBtn = document.getElementById('clear-chat');

// Toggle dropdown
menuButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && !menuButton.contains(e.target)) {
        dropdownMenu.classList.remove('show');
    }
});

// Close dropdown when pressing escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        dropdownMenu.classList.remove('show');
    }
});

// Handle menu item clicks
changeModelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropdownMenu.classList.remove('show');
    ipcRenderer.send("getCurrentModel");
    document.querySelector("#path-dialog-bg > div > div.dialog-button > button.secondary").style.display = "";
    document.querySelector("#path-dialog-bg > div > div.dialog-title > h3").innerText = "Change model path";
    document.getElementById("path-dialog-bg").classList.remove("hidden");
});

clearChatBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropdownMenu.classList.remove('show');
    stopButton.click();
    stopButton.removeAttribute("disabled");
    const messages = document.querySelectorAll("#messages li");
    for (const element of messages) {
        element.remove();
    }
    setTimeout(() => {
        const remainingMessages = document.querySelectorAll("#messages li");
        for (const element of remainingMessages) {
            element.remove();
        }
    }, 100);
    placeholder.classList.remove('hidden');
});

