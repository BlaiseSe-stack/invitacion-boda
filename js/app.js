
            const URL_WEBHOOK_GOOGLE = "https://script.google.com/macros/s/AKfycbyRyiVIpiRbGrR5zsnspXKwjk5ua56KJB8UC9ojl0jaqdhGK-vpCrYWYAKcOu86cPb2FQ/exec";
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
                    contenedorCheckboxes += `
                        <div style="display: flex; align-items: center; margin-bottom: 12px; font-size: 1.1rem;">
                            <input type="checkbox" id="invitado_${index}" name="asistentes_boda" value="${nombre}" checked 
                                   style="width: 18px; height: 18px; margin-right: 12px; accent-color: #b58d88; cursor: pointer;" class="individual-check">
                            <label for="invitado_${index}" style="cursor: pointer; user-select: none;">${nombre}</label>
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
            // 3. EVENTO: BOTÓN DE BÚSQUEDA (GET VIA JSONP) - CORREGIDO
            // =========================================================================
            document.getElementById("btn-search-family").addEventListener("click", function() {
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
            // BOTÓN DE CONFIRMACIÓN EN APP.JS (CORREGIDO CON LA VARIABLE TIPO)
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

                const nombreFamiliaVisual = nombresVisualesFamilias[idFamiliaSeleccionada];
                const listaAsistentes = seleccionados.join(", ");

                const btn = document.getElementById("btn-submit-rsvp");
                btn.innerText = "ENVIANDO...";
                btn.disabled = true;

                // Convertimos los datos al formato nativo URL-encoded
                const datosFormulario = new URLSearchParams();
                datosFormulario.append("familia", nombreFamiliaVisual);
                datosFormulario.append("asistieron", listaAsistentes);
                // ⚠️ ESTA ES LA LÍNEA CRUCIAL QUE FALTABA:
                datosFormulario.append("tipo", "rsvp"); 

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