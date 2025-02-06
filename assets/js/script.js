let models = mdl = {}
var converter = new showdown.Converter(); // md to html converter
let chats = []
// const dflt = "deepseek-r1:7b" // default model
const dflt = "llama3.2:latest" // default model

var toastElList = [].slice.call(document.querySelectorAll('.toast'))
var toastList = toastElList.map(function (toastEl) {
    return new bootstrap.Toast(toastEl, {
        delay: 1500
    })
})

get_models()
document.getElementById('prompt').focus()

document.addEventListener('keydown', (event) => {
    if(event.ctrlKey && event.key == "Enter") {
        get_result()
    }
});

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
            setModel()
        }
    });
}


function setModel() {
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