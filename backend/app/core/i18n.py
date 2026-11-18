"""The API's messages in the reader's language.

The app sends its language in the Accept-Language header; error messages (and the few success messages) are
written in English in the code and translated here on the way out, so endpoints don't change. Messages with
values in them ("Please try again in 5 minutes") are matched as templates, and the values are translated too
when they're messages themselves. Emails use the language saved on the account (users.language).

A message missing here simply stays in English. backend/tests/test_i18n.py checks that every language has every
message and keeps the {placeholders}.
"""
import re
from functools import lru_cache
from typing import Optional

LANGUAGES = ("en", "es", "fr", "de", "ja")


def pick_language(accept_language: Optional[str]) -> str:
    """The first supported language in an Accept-Language header ("es-MX,es;q=0.9,en;q=0.8" -> "es")."""
    for part in (accept_language or "").split(","):
        code = part.split(";")[0].strip().lower().split("-")[0]
        if code in LANGUAGES:
            return code
    return "en"


# English template -> translations. {name} marks a value.
MESSAGES = {
    # ---- not found / permissions ----
    "Post not found": dict(es="Publicación no encontrada", fr="Publication introuvable", de="Beitrag nicht gefunden", ja="投稿が見つかりません"),
    "User not found": dict(es="Usuario no encontrado", fr="Utilisateur introuvable", de="Benutzer nicht gefunden", ja="ユーザーが見つかりません"),
    "Worker not found": dict(es="Profesional no encontrado", fr="Professionnel introuvable", de="Fachkraft nicht gefunden", ja="プロが見つかりません"),
    "Suggestion not found": dict(es="Idea no encontrada", fr="Idée introuvable", de="Idee nicht gefunden", ja="アイデアが見つかりません"),
    "Question not found": dict(es="Pregunta no encontrada", fr="Question introuvable", de="Frage nicht gefunden", ja="質問が見つかりません"),
    "Challenge not found": dict(es="Reto no encontrado", fr="Défi introuvable", de="Challenge nicht gefunden", ja="チャレンジが見つかりません"),
    "Story not found": dict(es="Historia no encontrada", fr="Story introuvable", de="Story nicht gefunden", ja="ストーリーが見つかりません"),
    "This account is private.": dict(es="Esta cuenta es privada.", fr="Ce compte est privé.", de="Dieses Konto ist privat.", ja="このアカウントは非公開です。"),
    "No follow request from this account": dict(es="Esta cuenta no te ha enviado ninguna solicitud", fr="Ce compte ne vous a envoyé aucune demande", de="Von diesem Konto gibt es keine Anfrage", ja="このアカウントからのフォローリクエストはありません"),
    "Profession not found": dict(es="Profesión no encontrada", fr="Métier introuvable", de="Beruf nicht gefunden", ja="職業が見つかりません"),
    "Unknown profession": dict(es="Profesión desconocida", fr="Métier inconnu", de="Unbekannter Beruf", ja="不明な職業です"),
    "Comment not found": dict(es="Comentario no encontrado", fr="Commentaire introuvable", de="Kommentar nicht gefunden", ja="コメントが見つかりません"),
    "That no longer exists.": dict(es="Eso ya no existe.", fr="Cela n'existe plus.", de="Das gibt es nicht mehr.", ja="これはもう存在しません。"),
    "That account no longer exists": dict(es="Esa cuenta ya no existe", fr="Ce compte n'existe plus", de="Dieses Konto gibt es nicht mehr", ja="このアカウントはもう存在しません"),
    "Not authenticated": dict(es="No has iniciado sesión", fr="Vous n'êtes pas connecté", de="Nicht angemeldet", ja="ログインしていません"),
    "Sign in to see your following feed": dict(es="Inicia sesión para ver a quién sigues", fr="Connectez-vous pour voir vos abonnements", de="Melde dich an, um deinen Feed zu sehen", ja="フォロー中のフィードを見るにはログインしてください"),
    "Only moderators can do this": dict(es="Solo los moderadores pueden hacer esto", fr="Seuls les modérateurs peuvent faire cela", de="Das dürfen nur Moderatoren", ja="この操作はモデレーターのみ可能です"),
    "You can't interact with this account.": dict(es="No puedes interactuar con esta cuenta.", fr="Vous ne pouvez pas interagir avec ce compte.", de="Mit diesem Konto kannst du nicht interagieren.", ja="このアカウントとはやり取りできません。"),
    "This account is suspended.": dict(es="Esta cuenta está suspendida.", fr="Ce compte est suspendu.", de="Dieses Konto ist gesperrt.", ja="このアカウントは停止されています。"),
    "This account has been suspended for breaking the community rules.": dict(es="Esta cuenta ha sido suspendida por incumplir las normas de la comunidad.", fr="Ce compte a été suspendu pour non-respect des règles de la communauté.", de="Dieses Konto wurde wegen Verstößen gegen die Community-Regeln gesperrt.", ja="このアカウントはコミュニティのルール違反により停止されています。"),
    "You can only edit your own questions": dict(es="Solo puedes editar tus propias preguntas", fr="Vous ne pouvez modifier que vos propres questions", de="Du kannst nur deine eigenen Fragen bearbeiten", ja="編集できるのは自分の質問だけです"),
    "You can only edit your own ideas": dict(es="Solo puedes editar tus propias ideas", fr="Vous ne pouvez modifier que vos propres idées", de="Du kannst nur deine eigenen Ideen bearbeiten", ja="編集できるのは自分のアイデアだけです"),
    "You can only edit your own comments": dict(es="Solo puedes editar tus propios comentarios", fr="Vous ne pouvez modifier que vos propres commentaires", de="Du kannst nur deine eigenen Kommentare bearbeiten", ja="編集できるのは自分のコメントだけです"),
    "You can only delete your own stories": dict(es="Solo puedes eliminar tus propias historias", fr="Vous ne pouvez supprimer que vos propres stories", de="Du kannst nur deine eigenen Storys löschen", ja="削除できるのは自分のストーリーだけです"),
    "You can only change your own posts": dict(es="Solo puedes cambiar tus propias publicaciones", fr="Vous ne pouvez modifier que vos propres publications", de="Du kannst nur deine eigenen Beiträge ändern", ja="変更できるのは自分の投稿だけです"),
    "You can only change your own challenges": dict(es="Solo puedes cambiar tus propios retos", fr="Vous ne pouvez modifier que vos propres défis", de="Du kannst nur deine eigenen Challenges ändern", ja="変更できるのは自分のチャレンジだけです"),
    "Only the professional who was asked can answer this question": dict(es="Solo el profesional al que se preguntó puede responder", fr="Seul le professionnel interrogé peut répondre à cette question", de="Nur die gefragte Fachkraft kann diese Frage beantworten", ja="この質問に回答できるのは質問されたプロだけです"),
    "Only the person who posted this challenge can accept a solution": dict(es="Solo quien publicó este reto puede aceptar una solución", fr="Seule la personne qui a publié ce défi peut accepter une solution", de="Nur wer diese Challenge gepostet hat, kann eine Lösung annehmen", ja="解決策を採用できるのはチャレンジの投稿者だけです"),
    "Only the commenter or the post's author can delete this comment": dict(es="Solo quien comentó o el autor de la publicación puede eliminar este comentario", fr="Seuls l'auteur du commentaire ou de la publication peuvent supprimer ce commentaire", de="Nur der Kommentierende oder der Verfasser des Beitrags kann diesen Kommentar löschen", ja="このコメントを削除できるのはコメントした人か投稿者だけです"),
    "Only the author or the challenge owner can delete this idea": dict(es="Solo su autor o quien publicó el reto puede eliminar esta idea", fr="Seuls l'auteur ou le propriétaire du défi peuvent supprimer cette idée", de="Nur der Verfasser oder der Inhaber der Challenge kann diese Idee löschen", ja="このアイデアを削除できるのは投稿者かチャレンジの投稿者だけです"),
    "Only the asker or the professional asked can delete this question": dict(es="Solo quien preguntó o el profesional al que se preguntó puede eliminar esta pregunta", fr="Seuls l'auteur de la question ou le professionnel interrogé peuvent la supprimer", de="Nur der Fragende oder die gefragte Fachkraft kann diese Frage löschen", ja="この質問を削除できるのは質問した人か質問されたプロだけです"),
    "Moderators can't be suspended here": dict(es="Aquí no se puede suspender a moderadores", fr="Les modérateurs ne peuvent pas être suspendus ici", de="Moderatoren können hier nicht gesperrt werden", ja="ここではモデレーターを停止できません"),
    "An account can't be removed; suspend it instead": dict(es="Una cuenta no se puede eliminar; suspéndela", fr="Un compte ne peut pas être supprimé ; suspendez-le plutôt", de="Ein Konto kann nicht entfernt werden – sperre es stattdessen", ja="アカウントは削除できません。代わりに停止してください"),
    # ---- conflicts and rules ----
    "Email already registered": dict(es="Ese correo ya está registrado", fr="Cet e-mail est déjà enregistré", de="Diese E-Mail ist bereits registriert", ja="このメールアドレスはすでに登録されています"),
    "Username already taken": dict(es="Ese nombre de usuario ya existe", fr="Ce nom d'utilisateur est déjà pris", de="Dieser Benutzername ist schon vergeben", ja="このユーザー名はすでに使われています"),
    "Username or email already registered": dict(es="Ese usuario o correo ya está registrado", fr="Ce nom d'utilisateur ou cet e-mail est déjà enregistré", de="Benutzername oder E-Mail bereits registriert", ja="このユーザー名またはメールアドレスはすでに登録されています"),
    "You can't review your own post": dict(es="No puedes reseñar tu propia publicación", fr="Vous ne pouvez pas donner un avis sur votre propre publication", de="Du kannst deinen eigenen Beitrag nicht bewerten", ja="自分の投稿はレビューできません"),
    "You already reviewed this post": dict(es="Ya reseñaste esta publicación", fr="Vous avez déjà donné un avis sur cette publication", de="Du hast diesen Beitrag bereits bewertet", ja="この投稿はすでにレビュー済みです"),
    "You can't report your own content.": dict(es="No puedes denunciar tu propio contenido.", fr="Vous ne pouvez pas signaler votre propre contenu.", de="Du kannst deine eigenen Inhalte nicht melden.", ja="自分のコンテンツは報告できません。"),
    "You can't follow yourself": dict(es="No puedes seguirte a ti mismo", fr="Vous ne pouvez pas vous suivre vous-même", de="Du kannst dir nicht selbst folgen", ja="自分自身はフォローできません"),
    "You can't block yourself": dict(es="No puedes bloquearte a ti mismo", fr="Vous ne pouvez pas vous bloquer vous-même", de="Du kannst dich nicht selbst blockieren", ja="自分自身はブロックできません"),
    "Vote already recorded": dict(es="El voto ya está registrado", fr="Vote déjà enregistré", de="Stimme bereits gezählt", ja="投票はすでに記録されています"),
    "Like already recorded": dict(es="El me gusta ya está registrado", fr="J'aime déjà enregistré", de="Like bereits gezählt", ja="いいねはすでに記録されています"),
    "This question has been answered, so it can't be edited": dict(es="Esta pregunta ya tiene respuesta, así que no se puede editar", fr="Cette question a reçu une réponse, elle ne peut donc plus être modifiée", de="Diese Frage wurde beantwortet und kann daher nicht mehr bearbeitet werden", ja="この質問は回答済みのため編集できません"),
    "This idea was accepted as the solution, so it can't be edited": dict(es="Esta idea se aceptó como solución, así que no se puede editar", fr="Cette idée a été acceptée comme solution, elle ne peut donc plus être modifiée", de="Diese Idee wurde als Lösung angenommen und kann daher nicht mehr bearbeitet werden", ja="このアイデアは解決策に採用されたため編集できません"),
    "Another solution was just accepted. Refresh and try again.": dict(es="Se acaba de aceptar otra solución. Actualiza e inténtalo de nuevo.", fr="Une autre solution vient d'être acceptée. Actualisez et réessayez.", de="Gerade wurde eine andere Lösung angenommen. Lade neu und versuche es erneut.", ja="別の解決策が採用されたところです。再読み込みしてもう一度お試しください。"),
    "This account has no sign-up survey to update": dict(es="Esta cuenta no tiene encuesta de registro que actualizar", fr="Ce compte n'a pas de questionnaire d'inscription à mettre à jour", de="Dieses Konto hat keine Umfrage aus der Registrierung", ja="このアカウントには更新できる登録アンケートがありません"),
    # ---- passwords and logins ----
    "Invalid username or password": dict(es="Usuario o contraseña incorrectos", fr="Nom d'utilisateur ou mot de passe incorrect", de="Benutzername oder Passwort falsch", ja="ユーザー名またはパスワードが正しくありません"),
    "Password is incorrect": dict(es="La contraseña es incorrecta", fr="Le mot de passe est incorrect", de="Das Passwort ist falsch", ja="パスワードが正しくありません"),
    "Current password is incorrect": dict(es="La contraseña actual es incorrecta", fr="Le mot de passe actuel est incorrect", de="Das aktuelle Passwort ist falsch", ja="現在のパスワードが正しくありません"),
    "Choose a password different from the current one": dict(es="Elige una contraseña distinta de la actual", fr="Choisissez un mot de passe différent de l'actuel", de="Wähle ein anderes Passwort als das aktuelle", ja="現在とは別のパスワードを選んでください"),
    "Too many failed login attempts. Try again in {wait}.": dict(es="Demasiados intentos fallidos. Inténtalo de nuevo en {wait}.", fr="Trop de tentatives de connexion échouées. Réessayez dans {wait}.", de="Zu viele fehlgeschlagene Anmeldeversuche. Versuche es in {wait} erneut.", ja="ログインの失敗が多すぎます。{wait}後にもう一度お試しください。"),
    # ---- email links ----
    "If that account has a confirmed email address, we've sent it a link to choose a new password. Check your inbox (and the spam folder).": dict(
        es="Si esa cuenta tiene un correo confirmado, le hemos enviado un enlace para elegir una contraseña nueva. Revisa tu bandeja de entrada (y la carpeta de spam).",
        fr="Si ce compte a une adresse e-mail confirmée, nous y avons envoyé un lien pour choisir un nouveau mot de passe. Vérifiez votre boîte de réception (et les indésirables).",
        de="Wenn dieses Konto eine bestätigte E-Mail-Adresse hat, haben wir dorthin einen Link für ein neues Passwort geschickt. Sieh in deinem Posteingang (und im Spam-Ordner) nach.",
        ja="そのアカウントに確認済みのメールアドレスがあれば、新しいパスワードを設定するリンクを送りました。受信トレイ（と迷惑メールフォルダ）を確認してください。"),
    "This reset link is invalid, has expired or was already used. Ask for a new one.": dict(es="Este enlace no es válido, ha caducado o ya se usó. Pide uno nuevo.", fr="Ce lien est invalide, a expiré ou a déjà été utilisé. Demandez-en un nouveau.", de="Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet. Fordere einen neuen an.", ja="このリンクは無効か、期限切れか、すでに使用されています。新しいリンクを請求してください。"),
    "This confirmation link is invalid or has expired. Send a new one from Settings.": dict(es="Este enlace de confirmación no es válido o ha caducado. Envía uno nuevo desde Ajustes.", fr="Ce lien de confirmation est invalide ou a expiré. Envoyez-en un nouveau depuis les Paramètres.", de="Dieser Bestätigungslink ist ungültig oder abgelaufen. Sende in den Einstellungen einen neuen.", ja="この確認リンクは無効か期限切れです。設定から新しいリンクを送信してください。"),
    "Add an email address in Settings first.": dict(es="Primero añade un correo en Ajustes.", fr="Ajoutez d'abord une adresse e-mail dans les Paramètres.", de="Füge zuerst in den Einstellungen eine E-Mail-Adresse hinzu.", ja="先に設定でメールアドレスを追加してください。"),
    "Your email address is already confirmed.": dict(es="Tu correo ya está confirmado.", fr="Votre adresse e-mail est déjà confirmée.", de="Deine E-Mail-Adresse ist bereits bestätigt.", ja="メールアドレスはすでに確認済みです。"),
    "We've sent a new confirmation link to {email}.": dict(es="Hemos enviado un nuevo enlace de confirmación a {email}.", fr="Nous avons envoyé un nouveau lien de confirmation à {email}.", de="Wir haben einen neuen Bestätigungslink an {email} geschickt.", ja="{email} に新しい確認リンクを送りました。"),
    # ---- reports ----
    "Thanks for letting us know. A moderator will look at it.": dict(es="Gracias por avisarnos. Un moderador lo revisará.", fr="Merci de nous l'avoir signalé. Un modérateur va examiner cela.", de="Danke für den Hinweis. Ein Moderator sieht sich das an.", ja="お知らせいただきありがとうございます。モデレーターが確認します。"),
    # ---- photos ----
    "The photo couldn't be saved. Please try again.": dict(es="No se pudo guardar la foto. Inténtalo de nuevo.", fr="La photo n'a pas pu être enregistrée. Réessayez.", de="Das Foto konnte nicht gespeichert werden. Bitte versuche es erneut.", ja="写真を保存できませんでした。もう一度お試しください。"),
    "That file isn't a photo we can read. Use a JPEG, PNG, WebP or GIF image.": dict(es="Ese archivo no es una foto que podamos leer. Usa una imagen JPEG, PNG, WebP o GIF.", fr="Ce fichier n'est pas une photo lisible. Utilisez une image JPEG, PNG, WebP ou GIF.", de="Diese Datei ist kein lesbares Foto. Verwende ein JPEG-, PNG-, WebP- oder GIF-Bild.", ja="読み込める写真ではありません。JPEG・PNG・WebP・GIF画像を使ってください。"),
    "That photo format isn't supported. Use a JPEG, PNG, WebP or GIF image.": dict(es="Ese formato de foto no es compatible. Usa una imagen JPEG, PNG, WebP o GIF.", fr="Ce format de photo n'est pas pris en charge. Utilisez une image JPEG, PNG, WebP ou GIF.", de="Dieses Fotoformat wird nicht unterstützt. Verwende ein JPEG-, PNG-, WebP- oder GIF-Bild.", ja="この写真の形式には対応していません。JPEG・PNG・WebP・GIF画像を使ってください。"),
    "That photo is too large (too many pixels).": dict(es="Esa foto es demasiado grande (demasiados píxeles).", fr="Cette photo est trop grande (trop de pixels).", de="Dieses Foto ist zu groß (zu viele Pixel).", ja="写真が大きすぎます（ピクセル数が多すぎます）。"),
    "That photo is too big. The limit is {mb} MB.": dict(es="Esa foto pesa demasiado. El límite es {mb} MB.", fr="Cette photo est trop lourde. La limite est de {mb} Mo.", de="Dieses Foto ist zu groß. Die Grenze liegt bei {mb} MB.", ja="写真のサイズが大きすぎます。上限は{mb}MBです。"),
    "The file is empty.": dict(es="El archivo está vacío.", fr="Le fichier est vide.", de="Die Datei ist leer.", ja="ファイルが空です。"),
    "Photo uploads aren't set up on this server yet. Paste a link to an image instead.": dict(es="La subida de fotos aún no está configurada en este servidor. Pega un enlace a una imagen.", fr="L'envoi de photos n'est pas encore configuré sur ce serveur. Collez plutôt le lien d'une image.", de="Foto-Uploads sind auf diesem Server noch nicht eingerichtet. Füge stattdessen einen Bildlink ein.", ja="このサーバーでは写真のアップロードがまだ設定されていません。代わりに画像のリンクを貼り付けてください。"),
    # ---- spam limits: "{reason}. Please try again in {wait}." ----
    "{reason}. Please try again in {wait}.": dict(es="{reason}. Inténtalo de nuevo en {wait}.", fr="{reason}. Réessayez dans {wait}.", de="{reason}. Bitte versuche es in {wait} erneut.", ja="{reason}。{wait}後にもう一度お試しください。"),
    "Too many new accounts from this network": dict(es="Demasiadas cuentas nuevas desde esta red", fr="Trop de nouveaux comptes depuis ce réseau", de="Zu viele neue Konten aus diesem Netzwerk", ja="このネットワークからの新規アカウントが多すぎます"),
    "Too many password reset requests from this network": dict(es="Demasiadas solicitudes de restablecimiento desde esta red", fr="Trop de demandes de réinitialisation depuis ce réseau", de="Zu viele Anfragen zum Zurücksetzen aus diesem Netzwerk", ja="このネットワークからのパスワード再設定の請求が多すぎます"),
    "You're publishing a lot": dict(es="Estás publicando mucho", fr="Vous publiez beaucoup", de="Du veröffentlichst sehr viel", ja="投稿が多すぎます"),
    "You've shared a lot of stories": dict(es="Has compartido muchas historias", fr="Vous avez partagé beaucoup de stories", de="Du hast sehr viele Storys geteilt", ja="ストーリーの投稿が多すぎます"),
    "You're commenting very fast": dict(es="Estás comentando muy rápido", fr="Vous commentez très vite", de="Du kommentierst sehr schnell", ja="コメントのペースが速すぎます"),
    "You've asked a lot of questions": dict(es="Has hecho muchas preguntas", fr="Vous avez posé beaucoup de questions", de="Du hast sehr viele Fragen gestellt", ja="質問が多すぎます"),
    "You're doing that very fast": dict(es="Lo estás haciendo muy rápido", fr="Vous faites cela très vite", de="Du machst das sehr schnell", ja="操作のペースが速すぎます"),
    "You're making a lot of changes": dict(es="Estás haciendo muchos cambios", fr="Vous faites beaucoup de modifications", de="Du nimmst sehr viele Änderungen vor", ja="変更が多すぎます"),
    "You've sent a lot of reports": dict(es="Has enviado muchas denuncias", fr="Vous avez envoyé beaucoup de signalements", de="Du hast sehr viele Meldungen gesendet", ja="報告が多すぎます"),
    "You've uploaded a lot of photos": dict(es="Has subido muchas fotos", fr="Vous avez envoyé beaucoup de photos", de="Du hast sehr viele Fotos hochgeladen", ja="写真のアップロードが多すぎます"),
    "You've downloaded your data several times already": dict(es="Ya has descargado tus datos varias veces", fr="Vous avez déjà téléchargé vos données plusieurs fois", de="Du hast deine Daten schon mehrmals heruntergeladen", ja="データのダウンロードはすでに何度も行われています"),
    "We've already sent you several emails": dict(es="Ya te hemos enviado varios correos", fr="Nous vous avons déjà envoyé plusieurs e-mails", de="Wir haben dir schon mehrere E-Mails geschickt", ja="すでに何通かメールを送っています"),
    # ---- waiting times (values inside the messages above) ----
    "1 second": dict(es="1 segundo", fr="1 seconde", de="1 Sekunde", ja="1秒"),
    "{n} seconds": dict(es="{n} segundos", fr="{n} secondes", de="{n} Sekunden", ja="{n}秒"),
    "1 minute": dict(es="1 minuto", fr="1 minute", de="1 Minute", ja="1分"),
    "{n} minutes": dict(es="{n} minutos", fr="{n} minutes", de="{n} Minuten", ja="{n}分"),
    "1 hour": dict(es="1 hora", fr="1 heure", de="1 Stunde", ja="1時間"),
    "{n} hours": dict(es="{n} horas", fr="{n} heures", de="{n} Stunden", ja="{n}時間"),
}


@lru_cache(maxsize=None)
def _pattern(template: str):
    parts = re.split(r"(\{\w+\})", template)
    regex = "".join(f"(?P<{p[1:-1]}>.+?)" if re.fullmatch(r"\{\w+\}", p) else re.escape(p) for p in parts)
    return re.compile(f"^{regex}$", re.S)


_TEMPLATES = [k for k in MESSAGES if "{" in k]


def translate(text: str, lang: str) -> str:
    """`text` (an English message, possibly with values filled in) in `lang`; unknown text is returned as is."""
    if lang == "en" or not isinstance(text, str):
        return text
    known = MESSAGES.get(text)
    if known and lang in known:
        return known[lang]
    for template in _TEMPLATES:
        m = _pattern(template).match(text)
        if m and lang in MESSAGES[template]:
            values = {k: translate(v, lang) for k, v in m.groupdict().items()}
            return MESSAGES[template][lang].format(**values)
    return text


# ---------- emails ----------

EMAIL = {
    "en": {
        "verify.subject": "Confirm your email for Prologue",
        "verify.title": "Confirm your email",
        "verify.intro": "Hi {name}, please confirm that this is your email address. You'll then be able to reset your password with it if you ever forget it.",
        "verify.button": "Confirm my email",
        "verify.outro": "The link works for {days} days. If you didn't create a Prologue account or change your email, you can ignore this message.",
        "reset.subject": "Reset your Prologue password",
        "reset.title": "Reset your password",
        "reset.intro": "Hi {name}, someone (hopefully you) asked to reset the password of the Prologue account @{username}.",
        "reset.button": "Choose a new password",
        "reset.outro": "The link works for {minutes} minutes and only once. If you didn't ask for this, ignore this message: your password stays as it is.",
        "tagline": "Prologue — A story behind every profession",
    },
    "es": {
        "verify.subject": "Confirma tu correo para Prologue",
        "verify.title": "Confirma tu correo",
        "verify.intro": "Hola, {name}: confirma que esta es tu dirección de correo. Así podrás usarla para restablecer tu contraseña si alguna vez la olvidas.",
        "verify.button": "Confirmar mi correo",
        "verify.outro": "El enlace funciona durante {days} días. Si no creaste una cuenta en Prologue ni cambiaste tu correo, puedes ignorar este mensaje.",
        "reset.subject": "Restablece tu contraseña de Prologue",
        "reset.title": "Restablece tu contraseña",
        "reset.intro": "Hola, {name}: alguien (esperamos que tú) ha pedido restablecer la contraseña de la cuenta de Prologue @{username}.",
        "reset.button": "Elegir una contraseña nueva",
        "reset.outro": "El enlace funciona durante {minutes} minutos y una sola vez. Si no lo pediste, ignora este mensaje: tu contraseña no cambia.",
        "tagline": "Prologue — Una historia detrás de cada profesión",
    },
    "fr": {
        "verify.subject": "Confirmez votre e-mail pour Prologue",
        "verify.title": "Confirmez votre e-mail",
        "verify.intro": "Bonjour {name}, confirmez qu'il s'agit bien de votre adresse e-mail. Vous pourrez ensuite l'utiliser pour réinitialiser votre mot de passe si vous l'oubliez.",
        "verify.button": "Confirmer mon e-mail",
        "verify.outro": "Le lien est valable {days} jours. Si vous n'avez pas créé de compte Prologue ni changé d'e-mail, ignorez ce message.",
        "reset.subject": "Réinitialisez votre mot de passe Prologue",
        "reset.title": "Réinitialisez votre mot de passe",
        "reset.intro": "Bonjour {name}, quelqu'un (vous, nous l'espérons) a demandé à réinitialiser le mot de passe du compte Prologue @{username}.",
        "reset.button": "Choisir un nouveau mot de passe",
        "reset.outro": "Le lien est valable {minutes} minutes et une seule fois. Si vous n'avez rien demandé, ignorez ce message : votre mot de passe ne change pas.",
        "tagline": "Prologue — Une histoire derrière chaque métier",
    },
    "de": {
        "verify.subject": "Bestätige deine E-Mail für Prologue",
        "verify.title": "E-Mail bestätigen",
        "verify.intro": "Hallo {name}, bitte bestätige, dass das deine E-Mail-Adresse ist. Dann kannst du damit dein Passwort zurücksetzen, falls du es einmal vergisst.",
        "verify.button": "E-Mail bestätigen",
        "verify.outro": "Der Link ist {days} Tage gültig. Wenn du kein Prologue-Konto erstellt oder deine E-Mail nicht geändert hast, kannst du diese Nachricht ignorieren.",
        "reset.subject": "Setze dein Prologue-Passwort zurück",
        "reset.title": "Passwort zurücksetzen",
        "reset.intro": "Hallo {name}, jemand (hoffentlich du) möchte das Passwort des Prologue-Kontos @{username} zurücksetzen.",
        "reset.button": "Neues Passwort festlegen",
        "reset.outro": "Der Link ist {minutes} Minuten gültig und funktioniert nur einmal. Wenn du das nicht angefordert hast, ignoriere diese Nachricht: Dein Passwort bleibt unverändert.",
        "tagline": "Prologue — Hinter jedem Beruf steckt eine Geschichte",
    },
    "ja": {
        "verify.subject": "Prologueのメールアドレスを確認してください",
        "verify.title": "メールアドレスの確認",
        "verify.intro": "{name}さん、これがあなたのメールアドレスであることを確認してください。確認すると、パスワードを忘れたときにこのアドレスで再設定できます。",
        "verify.button": "メールアドレスを確認",
        "verify.outro": "リンクの有効期限は{days}日です。Prologueのアカウントを作成した覚えやメールアドレスを変更した覚えがない場合は、このメールを無視してください。",
        "reset.subject": "Prologueのパスワード再設定",
        "reset.title": "パスワードの再設定",
        "reset.intro": "{name}さん、Prologueアカウント@{username}のパスワード再設定のリクエストがありました。",
        "reset.button": "新しいパスワードを設定",
        "reset.outro": "リンクの有効期限は{minutes}分で、1回だけ使えます。心当たりがない場合は、このメールを無視してください。パスワードは変わりません。",
        "tagline": "Prologue — すべての仕事に、物語がある",
    },
}


def email_text(lang: str, key: str, **values) -> str:
    table = EMAIL.get(lang if lang in EMAIL else "en")
    return table.get(key, EMAIL["en"][key]).format(**values)
