let timestamp = Date.now()
const url = new URL(window.location.href)
let models = mdl = {}
var converter = new showdown.Converter(); // md to html converter
let chats = []
// const dflt = "deepseek-r1:8b" // default model
const dflt = "gemma3:4b" // default model
let autoscroll = true
let last_top = 0

var toastElList = [].slice.call(document.querySelectorAll('.toast'))
var toastList = toastElList.map(function (toastEl) {
    return new bootstrap.Toast(toastEl, {
        delay: 1500
    })
})

get_models()
document.getElementById('prompt').focus()
document.getElementById('new').href = url.pathname

document.addEventListener('keydown', (event) => {
    if(event.ctrlKey && event.key == "Enter") {
        get_result()
    }

    if(event.ctrlKey && event.altKey && event.key == "s") {
        if (document.getElementById('chat-container').classList.contains('col-sm-10')) {
            hide_sidebar()
        } else {
            show_sidebar()
        }
    }

    if(event.ctrlKey && event.altKey && event.key == "h") {
        document.getElementById('is-history').checked = ! document.getElementById('is-history').checked
    }

    if(event.ctrlKey && event.altKey && event.key == "t") {
        get_title()
    }
});

// Initialize tooltips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

const db_name = "lollama_data"
const table_name = "history"
const version = 1
const openRequest = indexedDB.open(db_name, version);
let db

openRequest.onsuccess = function (event) { 
    db = event.target.result
    console.log("Database created", db) 

    if (document.getElementById('histories')) {
        load_history()
    }

    console.log(url)
    
    if (url.searchParams.get('timestamp')) {
        timestamp = parseInt(url.searchParams.get('timestamp'))
        load_chat()
    } else {
        const date = new Date(timestamp)
        document.getElementById('title').value = date.toLocaleString('id-ID')
    }
}

openRequest.onupgradeneeded = function (event) {
    const db = event.target.result;

    // Create an object store 
    const objStore = db.createObjectStore(table_name, { keyPath: "timestamp", autoIncrement: true, })
    
    // Create indexes 
    if (!db.objectStoreNames.contains('timestamp')) {
        objStore.createIndex("timestamp", "timestamp", { unique: true })
        console.log('timestamp created')
    }
    if (!db.objectStoreNames.contains('updated_at')) {
        objStore.createIndex("updated_at", "updated_at", { unique: false }) 
        console.log('updated_at created')
    }
    if (!db.objectStoreNames.contains('data')) {
        objStore.createIndex("data", "data", { unique: false }) 
        console.log('data created')
    }
    if (!db.objectStoreNames.contains('title')) {
        objStore.createIndex("title", "title", { unique: false }) 
        console.log('title created')
    }
}

document.getElementById('chats').onscroll = (e) => {
    let target = e.target
    let scroll_position = target.scrollTop
    const btm = document.getElementById('btn-down')
    
    if (scroll_position < last_top) {
        autoscroll = false
        btm.style.setProperty('margin-top', '-4em')
    }

    if (scroll_position > (target.scrollTopMax - 50)) {
        autoscroll = true
        btm.style.setProperty('margin-top', '1em')
    }

    last_top = scroll_position
}

function add_history (history_data) { 
    const transaction = db.transaction(table_name, "readwrite"); 
    const objStore = transaction.objectStore(table_name)

    const request = objStore.add(history_data)
    
    request.onsuccess = function (event) { 
        console.log('add success', event, history_data)
    }
    
    request.onerror = function (event) { 
        console.log('add fail', event, history_data)
    }
}

function get_history(id = null) {
    const transaction = db.transaction(table_name, "readonly")
    const objStore = transaction.objectStore(table_name)
    
    let request
    if (id === null) {
        // Get all data
        request = objStore.getAll()
    } else {
        // Make a request to get the data 
        request = objStore.get(id)
    }

    let resp = new Promise((resolve, reject) => {
        request.onsuccess = function (event) { 
            console.log('event.target', event.target)
            console.log('event.target.result', event.target.result)
            resolve(event.target.result)
        }

        request.onerror = function () {
            resolve(false)
        }
    })

    return resp
}

function update_history (history_data) {
    const transaction = db.transaction(table_name, "readwrite")
    const objStore = transaction.objectStore(table_name)

    // Make a request to get the data 
    const getRequest = objStore.get(timestamp)
    
    // Handle a success event 
    getRequest.onsuccess = function (event) { 
        // Get the old user data 
        const history = event.target.result
        console.log('history :', history)
        
        // Make a request to update the data 
        const putRequest = objStore.put(history_data)
        
        putRequest.onsuccess = function (event) { 
            console.log('update success', event, history_data)
        }
        putRequest.onerror = function (event) { 
            console.log('update fail', event, history_data)
        }
    }
    getRequest.onerror = function (event) {
        console.log('update fail request', event, history_data)
    }
}

function load_history() {
    get_history().then((data) => {
        console.log('load_history data.result :', data)
        data.reverse().forEach(d => {
            const date = new Date(d.timestamp)
            
            let title = ""

            if (d.title && d.title != '') {
                title = d.title
            } else {
                title = date.toLocaleString('id-ID')
            }

            let content = `<a class="nav-link" href="?timestamp=${d.timestamp}" id="link-history-${d.timestamp}">${title} (${d.data.length}) <small>🭸${d.timestamp}</small></a>`

            let li = document.createElement('li')
            li.setAttribute('id', 'history-' + d.timestamp)
            li.classList.add('nav-item')
            li.innerHTML = content
        
            document.getElementById('histories').appendChild(li)
        })
    })
}

function load_chat() {
    get_history(timestamp).then((data) => {
        document.querySelector(`#history-${timestamp} a`).classList.add('text-info')
        document.querySelector(`#history-${timestamp} a`).style.setProperty('font-weight', 'bold')
        document.querySelector(`#history-${timestamp} a`).scrollIntoView()

        console.log('load_chat data', data);
        console.log('-----');
        
        data.data.forEach(d => {
            // console.log(d)
            chats.push(d)

            const id_prompt = 'chat-' + (chats.length)

            const chatDiv = document.createElement('div')
            chatDiv.id = id_prompt
            chatDiv.classList.add('clearfix')

            if (d.role == 'user') {
                prompt = d.content.replaceAll("\n", "<br>")
                prompt = converter.makeHtml(prompt)
                chatDiv.innerHTML = `<div class="float-end alert alert-info mw-100">${prompt}</div>`
            } else {
                let content = `<h5><span class="badge bg-secondary text-info badge-name">${d.model}</span></h5>`

                const duration = d.detail.eval_duration / Math.pow(10, 9);
                const tokens = d.detail.eval_count
                const bench = tokens / duration
                // console.log('duration : ', duration, 'bench : ', bench);

                const detail = `<footer class="blockquote-footer">${tokens} tok | ${duration} s | ${bench} tok/s</footer>`;

                content += `<div class="float-start alert alert-dark mw-100" id="content-${id_prompt}">${converter.makeHtml(d.content)} ${detail}</div>`
                chatDiv.innerHTML = content
            }
            document.getElementById("chats").appendChild(chatDiv)
            document.getElementById(id_prompt).scrollIntoView()
            
            select_pre()
            to_bottom()
        });
        document.getElementById('title').value = data.title ?? timestamp
    })
}

function get_models() {
    const server = document.getElementById('server').value
    const url = server + "/api/tags"
    let modelElement = document.getElementById('model');
    
    modelElement.innerHTML = "<option value=''>''</option>";
    
    fetch(url)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        mdl = data.models.sort((a,b) => {return a.name.localeCompare(b.name)})
        
        modelElement.innerHTML = '';
        
        mdl.forEach(m => {
            models[m.model] = m.name;
            
            // Create the option element
            const opt = document.createElement('option');
            opt.value = m.model;
            opt.textContent = m.name;
            modelElement.appendChild(opt);
        })
        
        if (Object.keys(models).includes(dflt)) {
            // Update default value in DOM
            const modelOptions = document.getElementById('model');
            modelOptions.value = dflt;  // Set the value directly
            set_model()
        }
    });
}


function set_model() {
    const model = document.querySelector('#model option:checked').value
    const id_chg = "chg-" + Date.now();

    const chatDivResp = document.createElement('div');
    chatDivResp.id = id_chg;
    chatDivResp.classList.add('container');
    chatDivResp.classList.add('mb-3');
    // chatDivResp.classList.add('text-info');
    chatDivResp.style.textAlign = 'center';
    // chatDivResp.innerHTML = `Model changed to <b>${model}</b>`;
    chatDivResp.innerHTML = `<span class="badge bg-secondary">Model set to <span class="text-info">${model}</span></span>`;
    document.getElementById("chats").appendChild(chatDivResp);
}

function select_pre() {
    const pre = document.querySelectorAll('pre')

    pre.forEach(p => {
        p.ondblclick = function (e) {
            console.log('e', e)
            console.log('e target', e.target)
            
            let comp = e.target.tagName == 'PRE' ? e.target.firstChild.firstChild : e.target.firstChild
            // let comp = e.target.firstChild.firstChild
            
            let range = new Range();
            range.setStart(comp, 0)
            range.setEnd(comp, comp.length)

            document.getSelection().removeAllRanges()
            document.getSelection().addRange(range)
        }
    })
}

function to_bottom() {
    document.getElementById('chats').lastChild.lastChild.lastChild.scrollIntoView()
}

function hide_sidebar() {
    let sidebar = document.getElementById('sidebar')
    let chat = document.getElementById('chat-container')
    let show = document.getElementById('show-sidebar')

    sidebar.style.setProperty('display', 'none')
    chat.classList.replace('col-sm-10', 'col-sm-12')
    show.style.setProperty('display', 'block')
}

function show_sidebar() {
    let sidebar = document.getElementById('sidebar')
    let chat = document.getElementById('chat-container')
    let show = document.getElementById('show-sidebar')

    sidebar.style.setProperty('display', 'block')
    chat.classList.replace('col-sm-12', 'col-sm-10')
    show.style.setProperty('display', 'none')
}

function set_title(title = null) {
    title = title ?? document.getElementById('title').value
    const date = new Date(timestamp)
    
    new_history = {
        timestamp: timestamp,
        updated_at: Date.now(),
        data: chats,
        title: title,
    }

    update_history(new_history)

    document.getElementById('link-history-' + timestamp).innerHTML = `${title} (${chats.length}) <small>🭸${timestamp}</small>`

    alert('Title Updated')
}

function get_title() {
    const server = document.getElementById('server').value
    const url = server + "/api/chat"

    let chat_send = chats.concat([{
        role:"user",
        content:"make title for this conversation in max 5 words. dont give another explanation"
    }])

    const data_send = {
        model: model.value,
        messages: chat_send,
        stream: false,
    }

    document.getElementById('btn-get-title').disabled = true
    document.getElementById('btn-set-title').disabled = true
    document.getElementById('title').disabled = true

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data_send)
    })
    .then((response) => response.json())
    .then((data) => {
        let content = data.message.content
        console.log(data, content)

        document.getElementById('title').value = content
        set_title()
    })
    .finally(() => {
        document.getElementById('btn-get-title').disabled = false
        document.getElementById('btn-set-title').disabled = false
        document.getElementById('title').disabled = false
    })
}