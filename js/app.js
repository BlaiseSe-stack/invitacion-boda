
const URL_WEBHOOK_GOOGLE = "https://script.google.com/macros/s/AKfycbwxIu-RCkTtZW82GARIlSXdcj9-zt6fhzjLsUolTHg3iqW9RMbMK0nLniTRkHeJjlFP_A/exec";
let idFamiliaSeleccionada = "";

            function normalizarApellidos(texto) {
                return texto.toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "") 
                            .replace(/\s+/g, ' ')            
                            .trim();
            }

            function configurarSuperCheck() {}

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
                    // ✨ TIP EXTRA: Si el nombre contiene la etiqueta, la cambiamos por un emoji tierno en la pantalla
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
            // 2. FUNCIÓN GLOBAL DE RESPUESTA (JSONP) - EVITA TOTALMENTE EL CORS
            // =========================================================================
            window.respuestaGoogleJSONP = function(data) {
                const errorMsg = document.getElementById("search-error-msg");
                const btnBuscar = document.getElementById("btn-search-family");
                
                btnBuscar.disabled = false;
                errorMsg.style.color = "#cc0000"; 

                const datosFamilia = baseInvitadosEstricta[idFamiliaSeleccionada];
                const integrantes = datosFamilia ? datosFamilia.integrantes : [];
                const apellidoVisual = nombresVisualesFamilias[idFamiliaSeleccionada];

                // Eliminar el script temporal creado
                const scriptAntiguo = document.getElementById("jsonp-google-script");
                if (scriptAntiguo) scriptAntiguo.remove();

                if (data.confirmado === true) {
                    errorMsg.innerHTML = `<span style="font-size: 1.1rem; color: #b58d88; font-weight: bold;">✨ ¡Tu familia ya está confirmada!</span><br>
                    <span style="font-size:0.95rem; color:#5c4d4d; display:block; margin-top:5px;">Ya contamos con tu asistencia registrada en nuestro sistema. ¡Muchas gracias por bloquear la fecha, nos vemos muy pronto!</span>`;
                    return;
                }

                desplegarFormularioInvitados(integrantes, apellidoVisual, idFamiliaSeleccionada);
            };

            // =========================================================================
            // 3. EVENTO: FORMULARIO DE BÚSQUEDA (SOPORTA ENTER Y TECLADOS MÓVILES)
            // =========================================================================
            document.getElementById("rsvp-search-form").addEventListener("submit", function(event) {
                // Evitamos que la página se recargue al dar Enter o Buscar
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

                // 2. ASIGNACIÓN ASÍGNEA: Guardamos la llave REAL de la base de datos
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
                
                // Configuración de la petición JSONP inyectando una etiqueta script
                const src = `${URL_WEBHOOK_GOOGLE}?familia=${encodeURIComponent(apellidoVisual)}&callback=respuestaGoogleJSONP`;
                
                const script = document.createElement("script");
                script.id = "jsonp-google-script";
                script.src = src;
                
                script.onerror = function() {
                    console.log("Fallo de red, usando datos locales...");
                    btnBuscar.disabled = false;
                    script.remove();
                    desplegarFormularioInvitados(datosFamilia.integrantes, apellidoVisual, busqueda);
                };

                document.body.appendChild(script);
            });

            // =========================================================================
            // BOTÓN DE CONFIRMACIÓN EN APP.JS (CORREGIDO CON CONTEO DE NIÑOS AUTOMÁTICO)
            // =========================================================================
            document.getElementById("btn-submit-rsvp").addEventListener("click", function() {
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

                // 👶 LÓGICA AUTOMÁTICA DE CONTEO TRAS BAMBALINAS
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

                // Convertimos los datos al formato nativo URL-encoded
                const datosFormulario = new URLSearchParams();
                datosFormulario.append("familia", nombreFamiliaVisual);
                datosFormulario.append("asistieron", listaAsistentes);
                datosFormulario.append("tipo", "rsvp"); 
                
                // 📊 ENVIAMOS LOS TOTALES AUTOMÁTICOS A LAS NUEVAS COLUMNAS DE TU GOOGLE SHEETS
                datosFormulario.append("adultos", adultosConfirmados);
                datosFormulario.append("ninos", ninosConfirmados);

                // FETCH HACIA GOOGLE SHEETS
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
            // 5. FUNCIÓN UNIFICADA: APERTURA DEL SOBRE + INICIO DE MÚSICA NATIVA (HTML5)
            // =========================================================================
            function abrirSobre(elementoSobre) {
                // 1. Obtener el elemento de audio nativo
                const musica = document.getElementById("musica-boda");

                // 2. Disparar la música de inmediato (Síncrono para engañar el bloqueo de iOS y Android)
                if (musica) {
                    musica.play().catch(function(error) {
                        console.log("El navegador bloqueó el audio temporalmente:", error);
                    });
                }

                // 3. Forzar al navegador a ir al inicio de la página inmediatamente
                window.scrollTo({
                    top: 0,
                    behavior: 'instant'
                });
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;

                // 4. Activar la animación CSS de la solapa levantándose
                elementoSobre.classList.add("open");
                
                // 5. Esperar a que termine de levantarse la solapa y desvanecer el sobre completo
                setTimeout(function() {
                    document.getElementById("envelope-layer").classList.add("fade-out");
                }, 800);
            }

        // =========================================================================
        // CONFIGURACIÓN DE FECHAS LÍMITE (Modifica con tus fechas reales)
        // =========================================================================
        // Ejemplo: Cierre de listas el 5 de Septiembre a las 23:59:59
        const FECHA_CIERRE_RSVP = new Date(2026, 8, 5, 23, 59, 59).getTime(); 
        
        // Ejemplo: El día de la Boda el 17 de Octubre a las 16:00:00
        const FECHA_BODA = new Date(2026, 9, 17, 16, 0, 0).getTime();

        // =========================================================================
        // EJECUCIÓN CONTINUA DE LOS CONTADORES
        // =========================================================================
        const intervaloRelojes = setInterval(function() {
            const ahora = new Date().getTime();

            // 1. CÁLCULO PARA EL CIERRE DE RSVP (SOBRE)
            const distanciaRsvp = FECHA_CIERRE_RSVP - ahora;
            if (distanciaRsvp < 0) {
                document.getElementById("timer-rsvp").innerText = "Lista Cerrada";
                // Opcional: Aquí podrías ocultar el formulario de confirmación si ya expiró el tiempo
            } else {
                document.getElementById("timer-rsvp").innerText = formatearTiempo(distanciaRsvp);
            }

            // 2. CÁLCULO PARA EL GRAN DÍA (INVITACIÓN)
            const distanciaBoda = FECHA_BODA - ahora;
            if (distanciaBoda < 0) {
                document.getElementById("timer-wedding").innerText = "¡Llegó el Gran Día!";
                clearInterval(intervaloRelojes);
            } else {
                document.getElementById("timer-wedding").innerText = formatearTiempo(distanciaBoda);
            }

        }, 1000); // Se actualiza cada 1 segundo (1000 ms)

        // FUNCIÓN AUXILIAR MATEMÁTICA PARA PASAR MILISEGUNDOS A TEXTO (DD HH MM SS)
        function formatearTiempo(milisegundos) {
            const dias = Math.floor(milisegundos / (1000 * 60 * 60 * 24));
            const horas = Math.floor((milisegundos % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutos = Math.floor((milisegundos % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((milisegundos % (1000 * 60)) / 1000);

            // Agregamos un cero a la izquierda si el número es menor a 10 para mantener la simetría visual
            const dStr = dias < 10 ? "0" + dias : dias;
            const hStr = horas < 10 ? "0" + horas : horas;
            const mStr = minutos < 10 ? "10" && minutos < 10 ? "0" + minutos : minutos : minutos;
            const sStr = segundos < 10 ? "0" + segundos : segundos;

            return `${dStr}d ${hStr}h ${mStr}m ${sStr}s`;
        }


// Seleccionamos el elemento de audio
const musica = document.getElementById('musica-boda');

// Escuchamos el evento de cambio de visibilidad de la página
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Si la pestaña no está visible, pausamos la música
    musica.pause();
    console.log("Música pausada porque el usuario salió de la pestaña.");
  } else {
    // Si el usuario regresa, reanudamos la música
    // Nota: El navegador solo la reproducirá si ya había interactuado antes con la página
    musica.play().catch(error => {
      console.log("No se pudo reanudar automáticamente por políticas del navegador:", error);
    });
  }
});
