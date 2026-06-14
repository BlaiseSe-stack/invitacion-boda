const URL_WEBHOOK_GOOGLE = "https://script.google.com/macros/s/AKfycbx-qj6QjIM_desyxfusjvo-sNAEU6Sm1Jnk0uXfn7oW-Lyz2pSvhyJrx4QxeKuNAafNUA/exec";
let idFamiliaSeleccionada = "";

function normalizarApellidos(texto) {
    return texto.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") 
                .replace(/\s+/g, ' ')            
                .trim();
}

function configurarSuperCheck() {
    const superCheck = document.getElementById("super-check");
    if (superCheck) {
        superCheck.addEventListener("change", function() {
            const checkboxes = document.querySelectorAll(".individual-check");
            checkboxes.forEach(chk => chk.checked = this.checked);
        });
    }
}

function desplegarFormularioInvitados(integrantes, apellidoVisual, busqueda) {
    document.getElementById("search-error-msg").style.display = "none";
    document.getElementById("rsvp-search-box").style.display = "none";

    idFamiliaSeleccionada = busqueda;
    const totalPases = integrantes.length; 
    const textoPlural = totalPases > 1 ? "pases asignados" : "pase asignado";

    document.getElementById("rsvp-family-header").innerHTML = `
        <div style="font-size: 1.35rem; font-weight: bold; margin-bottom: 4px;">Familia ${apellidoVisual}</div>
        <div style="font-size: 0.95rem; color: #b58d88; font-style: italic; margin-bottom: 20px;">(${totalPases} ${textoPlural})</div>
        <p style="font-size: 0.95rem; margin-bottom: 20px; line-height: 1.4; padding: 0 10px;">
            Selecciona únicamente a las personas que asistirán:
        </p>
    `;

    let contenedorCheckboxes = "";
    integrantes.forEach((nombre, index) => {
        let nombreVisualInvitado = nombre.replace("[niño]", "👶");

        contenedorCheckboxes += `
            <div style="display: flex; align-items: center; margin-bottom: 12px; font-size: 1.1rem;">
                <input type="checkbox" id="invitado_${index}" name="asistentes_boda" value="${nombre}" checked 
                       style="width: 18px; height: 18px; margin-right: 12px; accent-color: #b58d88; cursor: pointer;" class="individual-check">
                <label for="invitado_${index}" style="cursor: pointer; user-select: none;">${nombreVisualInvitado}</label>
            </div>`;
    });

    document.getElementById("rsvp-guests-list").innerHTML = contenedorCheckboxes;
    document.getElementById("wedding-rsvp-form").style.display = "block";
    configurarSuperCheck();
}

// =========================================================================
// INTERCEPCIÓN JSONP (EVITA ERRORES CORS EN EL GET DE CONSULTA)
// =========================================================================
window.respuestaGoogleJSONP = function(data) {
    const errorMsg = document.getElementById("search-error-msg");
    const btnBuscar = document.getElementById("btn-search-family");

    btnBuscar.disabled = false;
    errorMsg.style.color = "#cc0000"; 

    const datosFamilia = baseInvitadosEstricta[idFamiliaSeleccionada];
    const integrantes = datosFamilia ? datosFamilia.integrantes : [];
    const apellidoVisual = nombresVisualesFamilias[idFamiliaSeleccionada];

    const scriptAntiguo = document.getElementById("jsonp-google-script");
    if (scriptAntiguo) scriptAntiguo.remove();

    if (data.confirmado === true) {
        errorMsg.innerHTML = `<span style="font-size: 1.1rem; color: #b58d88; font-weight: bold;">✨ ¡Tu familia ya está confirmada!</span><br>
        <span style="font-size:0.95rem; color:#5c4d4d; display:block; margin-top:5px;">Ya contamos con tu asistencia registrada en nuestro sistema. ¡Muchas gracias!</span>`;
        errorMsg.style.display = "block";
        return;
    }

    desplegarFormularioInvitados(integrantes, apellidoVisual, idFamiliaSeleccionada);
};

// =========================================================================
// ENVÍO DEL FORMULARIO DE BÚSQUEDA
// =========================================================================
document.getElementById("rsvp-search-form").addEventListener("submit", function(event) {
    event.preventDefault(); 

    const inputTexto = document.getElementById("rsvp-search-input").value;
    let busqueda = normalizarApellidos(inputTexto); 
    const errorMsg = document.getElementById("search-error-msg");
    const btnBuscar = document.getElementById("btn-search-family");

    if (busqueda === "") {
        errorMsg.innerText = "Por favor, escribe tus dos apellidos.";
        errorMsg.style.display = "block";
        return;
    }   

    idFamiliaSeleccionada = busqueda; 
    const datosFamilia = baseInvitadosEstricta[busqueda];

    if (!datosFamilia || !datosFamilia.integrantes) {
        errorMsg.innerHTML = `No encontramos pases asignados para "${inputTexto}".<br><span style="font-size:0.85rem; color:#5c4d4d;">Asegúrate de ingresar ambos apellidos (Ej: Sánchez Espinosa).</span>`;
        errorMsg.style.display = "block";
        return;
    }

    errorMsg.style.color = "#b58d88"; 
    errorMsg.innerText = "Verificando pases en el sistema...";
    errorMsg.style.display = "block";
    btnBuscar.disabled = true;

    const apellidoVisual = nombresVisualesFamilias[busqueda];
    const src = `${URL_WEBHOOK_GOOGLE}?familia=${encodeURIComponent(apellidoVisual)}&callback=respuestaGoogleJSONP`;

    const script = document.createElement("script");
    script.id = "jsonp-google-script";
    script.src = src;

    script.onerror = function() {
        btnBuscar.disabled = false;
        script.remove();
        desplegarFormularioInvitados(datosFamilia.integrantes, apellidoVisual, busqueda);
    };

    document.body.appendChild(script);
});

// =========================================================================
// PROCESAMIENTO Y ENVÍO DE CONFIRMACIÓN A GOOGLE SHEETS
// =========================================================================
document.getElementById("btn-submit-rsvp").addEventListener("click", function(e) {
    e.preventDefault();
    
    const checkboxes = document.querySelectorAll(".individual-check");
    let seleccionados = [];

    checkboxes.forEach(chk => {
        if (chk.checked) {
            seleccionados.push(chk.value);
        }
    });

    if (seleccionados.length === 0) {
        alert("Si ningún integrante puede asistir, por favor avísanos de forma personal. ¡Muchas gracias!");
        return;
    }

    let adultosConfirmados = 0;
    let ninosConfirmados = 0;

    seleccionados.forEach(nombre => {
        if (nombre.includes("[niño]")) {
            ninosConfirmados++;
        } else {
            adultosConfirmados++;
        }
    });

    const nombreFamiliaVisual = nombresVisualesFamilias[idFamiliaSeleccionada];
    const listaAsistentes = seleccionados.join(", ");

    const btn = document.getElementById("btn-submit-rsvp");
    btn.innerText = "ENVIANDO...";
    btn.disabled = true;

    const datosFormulario = new URLSearchParams();
    datosFormulario.append("familia", nombreFamiliaVisual);
    datosFormulario.append("asistieron", listaAsistentes);
    datosFormulario.append("tipo", "rsvp"); 
    datosFormulario.append("adultos", adultosConfirmados);
    datosFormulario.append("ninos", ninosConfirmados);

    fetch(URL_WEBHOOK_GOOGLE, {
        method: "POST",
        mode: "no-cors", 
        headers: { 
            "Content-Type": "application/x-www-form-urlencoded" 
        },
        body: datosFormulario.toString()
    })
    .then(() => {
        document.getElementById("wedding-rsvp-form").style.display = "none";
        document.getElementById("rsvp-success-msg").style.display = "block";
    })
    .catch(err => {
        console.error("Error al guardar asistencia:", err);
        alert("Ocurrió un error al enviar la confirmación. Inténtalo de nuevo.");
        btn.innerText = "CONFIRMAR ASISTENCIA";
        btn.disabled = false;
    });
});

// =========================================================================
// APERTURA DEL SOBRE Y DESBLOQUEO DE AUDIO
// =========================================================================
function abrirSobre(elementoSobre) {
    const musica = document.getElementById("musica-boda");

    if (musica) {
        musica.muted = false; 
        musica.play().catch(function(error) {
            console.log("El navegador requería interacción previa:", error);
        });
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    elementoSobre.classList.add("open");

    setTimeout(function() {
        const capaSobre = document.getElementById("envelope-layer");
        if (capaSobre) capaSobre.classList.add("fade-out");
    }, 800);
}

// =========================================================================
// CONTADORES REVERSIVOS
// =========================================================================
const FECHA_CIERRE_RSVP = new Date(2026, 8, 5, 23, 59, 59).getTime(); 
const FECHA_BODA = new Date(2026, 9, 17, 16, 0, 0).getTime();

const intervaloRelojes = setInterval(function() {
    const ahora = new Date().getTime();

    const distanciaRsvp = FECHA_CIERRE_RSVP - nowOrTarget(ahora, FECHA_CIERRE_RSVP);
    const timerRsvpElement = document.getElementById("timer-rsvp");
    if (timerRsvpElement) {
        if (FECHA_CIERRE_RSVP - ahora < 0) {
            timerRsvpElement.innerText = "Lista Cerrada";
        } else {
            timerRsvpElement.innerText = formatearTiempo(FECHA_CIERRE_RSVP - ahora);
        }
    }

    const timerWeddingElement = document.getElementById("timer-wedding");
    if (timerWeddingElement) {
        if (FECHA_BODA - ahora < 0) {
            timerWeddingElement.innerText = "¡Llegó el Gran Día!";
            clearInterval(intervaloRelojes);
        } else {
            timerWeddingElement.innerText = formatearTiempo(FECHA_BODA - ahora);
        }
    }
}, 1000);

function nowOrTarget(now, target) { return now; }

function formatearTiempo(milisegundos) {
    const dias = Math.floor(milisegundos / (1000 * 60 * 60 * 24));
    const horas = Math.floor((milisegundos % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((milisegundos % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((milisegundos % (1000 * 60)) / 1000);

    const dStr = dias < 10 ? "0" + dias : dias;
    const hStr = horas < 10 ? "0" + horas : horas;
    const mStr = minutos < 10 ? "0" + minutos : minutos;
    const sStr = segundos < 10 ? "0" + segundos : segundos;

    return `${dStr}d ${hStr}h ${mStr}m ${sStr}s`;
}

// =========================================================================
// SISTEMA AUTOMÁTICO DE CONTROL DE AUDIO DE HARDWARE
// =========================================================================
const reproductorMusica = document.getElementById("musica-boda");

function gestionarSilencioSalida() {
    if (reproductorMusica && !reproductorMusica.paused) {
        localStorage.setItem("progreso_musica_boda", reproductorMusica.currentTime);
        reproductorMusica.muted = true; 
        reproductorMusica.pause();
    }
}

function gestionarAudioRegreso() {
    if (reproductorMusica && !document.hidden && document.hasFocus()) {
        const sobreAbierto = document.querySelector(".envelope-wrapper.fade-out") || document.getElementById("envelope-layer")?.classList.contains("fade-out");

        if (sobreAbierto) {
            const tiempoGuardado = localStorage.getItem("progreso_musica_boda");
            if (tiempoGuardado) {
                reproductorMusica.currentTime = parseFloat(tiempoGuardado);
            }
            reproductorMusica.muted = false;
            reproductorMusica.play().catch(function(e) {
                console.log("Reanudación móvil protegida.");
            });
        }
    }
}

document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
        gestionarSilencioSalida();
    } else {
        setTimeout(gestionarAudioRegreso, 250);
    }
});

window.addEventListener("pagehide", gestionarSilencioSalida);
window.addEventListener("pageshow", gestionarAudioRegreso);
