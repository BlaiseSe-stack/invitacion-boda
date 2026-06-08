import csv
import textwrap
import os
from PIL import Image, ImageDraw, ImageFont
import qrcode # <--- Nueva librería para los QR

# --- CONFIGURACIÓN DE TU EVENTO ---
USUARIO_GITHUB = "blaisese-stack"
REPOSITORIO_GITHUB = "invitacion-boda"
URL_BASE_ACCESO = f"https://{USUARIO_GITHUB}.github.io/{REPOSITORIO_GITHUB}/acceso.html"

# --- PALETA DE COLORES ---
COLOR_FONDO = "#fbf6f5"      
COLOR_TEXTO = "#5c4d4d"      
COLOR_DETALLES = "#b58d88"   

def generar_imagen_pase_con_qr(apellido_familia, texto_invitados, numero_pases):
    # 1. GENERAR PRIMERO EL CÓDIGO QR EN MEMORIA
    # Formateamos la llave para la URL (Ej: "Sánchez Espinoza" -> "sanchez-espinoza")
    llave_url = apellido_familia.lower().strip()
    for a, b in zip(["á","é","í","ó","ú","ñ"], ["a","e","i","o","u","n"]):
        llave_url = llave_url.replace(a, b)
    llave_url = llave_url.replace(" ", "-")
    
    enlace_qr = f"{URL_BASE_ACCESO}?familia={llave_url}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H, # Alta tolerancia si se raya la pantalla
        box_size=6,                                        # Tamaño del bloque del QR
        border=2,                                          # Margen blanco sutil
    )
    qr.add_data(enlace_qr)
    qr.make(fit=True)
    
    # Creamos la imagen del QR (Combinando tus colores para que combine con el pase)
    imagen_qr = qr.make_image(fill_color=COLOR_TEXTO, back_color=COLOR_FONDO)
    # Redimensionamos el QR a un tamaño ideal de 230x230 píxeles
    imagen_qr = imagen_qr.resize((230, 230))

    # 2. CREAR EL PASE DIGITAL (Tu lógica original con dimensiones ajustadas)
    ancho, alto = 800, 1000 
    imagen_pase = Image.new("RGB", (ancho, alto), COLOR_FONDO)
    canvas = ImageDraw.Draw(imagen_pase)
    
    # Marcos decorativos elegantes
    canvas.rectangle([(30, 30), (ancho-30, alto-30)], outline=COLOR_DETALLES, width=3)
    canvas.rectangle([(45, 45), (ancho-45, alto-45)], outline=COLOR_DETALLES, width=1)

    try:
        fuente_titulo = ImageFont.truetype("georgia.ttf", 55)
        fuente_familia = ImageFont.truetype("times.ttf", 50)
        fuente_subtitulo = ImageFont.truetype("times.ttf", 34)
        fuente_texto = ImageFont.truetype("times.ttf", 32)
    except IOError:
        fuente_titulo = fuente_familia = fuente_subtitulo = fuente_texto = ImageFont.load_default()

    # Lógica de conversión numérica
    try:
        cantidad = int(numero_pases)
    except ValueError:
        cantidad = 1 
        
    texto_pase_plural = "pases" if cantidad > 1 else "pase"
    texto_tipo_plural = "Familiar" if cantidad > 1 else "Personal"
    texto_invitado_plural = "Invitados" if cantidad > 1 else "Invitado"
    texto_invitados_incluidos = "Invitados incluidos:" if cantidad > 1 else ""

    # --- ENCABEZADO ---
    canvas.text((ancho/2, 110), "¡NUESTRA BODA!", fill=COLOR_DETALLES, font=fuente_titulo, anchor="mm")
    canvas.text((ancho/2, 185), f"Pase {texto_tipo_plural} e Intransferible", fill=COLOR_TEXTO, font=fuente_subtitulo, anchor="mm")
    canvas.line([(200, 220), (600, 220)], fill=COLOR_DETALLES, width=2)

    # --- PREPARACIÓN DEL TEXTO PRINCIPAL ---
    lineas_a_dibujar = []
    lineas_a_dibujar.append(texto_invitado_plural)
    lineas_a_dibujar.extend(textwrap.wrap(apellido_familia, width=24))
    
    if cantidad > 1:
        lineas_a_dibujar.append(f"{cantidad} {texto_pase_plural}")
    else:
        nombre_unico = texto_invitados.strip().strip(',')
        lineas_a_dibujar.extend(textwrap.wrap(nombre_unico, width=24))

    # --- DIBUJADO DE DATOS (Ajustado para dar espacio al QR abajo) ---
    interlineado = 52
    y_familia = 270

    for linea in lineas_a_dibujar:
        canvas.text((ancho/2, y_familia), linea, fill=COLOR_TEXTO, font=fuente_familia, anchor="mm")
        y_familia += interlineado

    # --- SECCIÓN: LISTA DE INTEGRANTES (Solo familiares) ---
    if cantidad > 1:
        canvas.text((ancho/2, 490), f"{texto_invitados_incluidos}", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")
        
        y_pauta = 540
        MAX_CARACTERES_POR_LINEA = 42 
        # Ponemos un límite de líneas visuales para que no pise el QR si la lista es enorme
        lista_nombres = [n for n in texto_invitados.split(',') if n.strip()]
        
        for linea in lista_nombres[:5]: # Muestra hasta 5 integrantes cómodamente
            sub_lineas = textwrap.wrap(linea, width=MAX_CARACTERES_POR_LINEA)
            for i, sub_linea in enumerate(sub_lineas):
                texto_a_dibujar = sub_linea if i == 0 else "   " + sub_linea
                canvas.text((ancho/2, y_pauta), texto_a_dibujar, fill=COLOR_TEXTO, font=fuente_texto, anchor="mm")
                y_pauta += 42

    # --- 3. PEGAR EL CÓDIGO QR EN LA IMAGEN ---
    # Colocamos el QR centrado horizontalmente en X=285 (800/2 - 230/2) y abajo en Y=680
    posicion_qr = (285, 680)
    imagen_pase.paste(imagen_qr, posicion_qr)

    # --- PIE DE PÁGINA (Abajo del QR) ---
    canvas.text((ancho/2, 940), "Muestra este código QR en la recepción.", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")

    # --- GUARDAR ARCHIVO ---
    # Creamos una carpeta para no revolver las imágenes en tu proyecto
    carpeta_salida = "pases_digitales"
    if not os.path.exists(carpeta_salida):
        os.makedirs(carpeta_salida)

    nombre_archivo = f"pase_{apellido_familia.replace(' ', '_').lower()}.png"
    for a, b in zip(["á","é","í","ó","ú","ñ"], ["a","e","i","o","u","n"]):
        nombre_archivo = nombre_archivo.replace(a, b)
        
    ruta_completa = os.path.join(carpeta_salida, nombre_archivo)
    imagen_pase.save(ruta_completa)
    print(f"✅ Pase con QR generado: {ruta_completa}")

# --- ENRUTADOR AUTOMÁTICO (LECTURA DEL CSV DE RESPUESTAS) ---
# Asegúrate de que los encabezados coincidan exactamente con tu CSV
if not os.path.exists('invitados.csv'):
    print("❌ Error: No se encontró el archivo 'invitados.csv' en esta carpeta.")
else:
    with open('invitados.csv', mode='r', encoding='utf-8') as archivo_csv:
        lector = csv.DictReader(archivo_csv)
        for fila in lector:
            # Usamos tus nombres de columna exactos del script anterior
            familia = fila['Familia']
            texto_qr = fila['InvitadosConfirmados']
            numero_pases = fila['TotalAsistentes'] 
            
            generar_imagen_pase_con_qr(familia, texto_qr, numero_pases)
    print("\n🎉 ¡Proceso terminado! Busca tus pases en la carpeta 'pases_digitales'.")