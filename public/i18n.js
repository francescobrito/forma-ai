// English is the source language. User messages, names, URLs and model IDs are never translated.
let language = 'en';
try { const saved = localStorage.getItem('forma.language'); if (['en', 'ru'].includes(saved)) language = saved; } catch {}
export const getLanguage = () => language;
export function setLanguage(value) { language = value === 'ru' ? 'ru' : 'en'; try { localStorage.setItem('forma.language', language); } catch {} if (typeof document !== 'undefined') { document.documentElement.lang = language; document.title = t('Forma — Your AI workspace'); } }
const ru = {
  'Welcome back.': 'С возвращением.',
  'Create an account.': 'Создай аккаунт.',
  'Make yourself at home.': 'Добро пожаловать.',
  'Sign in': 'Войти',
  'Sign out': 'Выйти',
  'Create account': 'Создать аккаунт',
  'New here? Create an account': 'Впервые здесь? Создать аккаунт',
  'Already have an account? Sign in': 'Уже есть аккаунт? Войти',
  'Your ideas. Your models. Your account.': 'Твои идеи. Твои модели. Твой аккаунт.',
  'Your name': 'Твоё имя',
  'Email': 'Электронная почта',
  'Password': 'Пароль',
  'For a new account, use at least 12 characters.': 'Для нового аккаунта — не менее 12 символов.',
  'Conversations and API keys are saved on this device for your account.': 'Чаты и API-ключи сохраняются на этом устройстве отдельно для твоего аккаунта.',
  'Enter a valid email address.': 'Введи корректную электронную почту.',
  'Enter a name between 1 and 80 characters.': 'Имя должно содержать от 1 до 80 символов.',
  'Use a password between 12 and 128 characters.': 'Пароль должен содержать от 12 до 128 символов.',
  'This email is already registered. Sign in.': 'Эта почта уже зарегистрирована. Войди в аккаунт.',
  'Incorrect email or password.': 'Неверная почта или пароль.',
  'Too many attempts. Try again in 15 minutes.': 'Слишком много попыток. Повтори через 15 минут.',
  'Account storage is unavailable. Try again later.': 'База аккаунтов недоступна. Повтори позже.',
  'Unable to reach the server. Refresh to try again.': 'Не удалось связаться с сервером. Обнови страницу.',
  'Hosted Forma requires a public HTTPS API URL.': 'На хостинге нужен публичный адрес API с HTTPS.',
  'Hosted Forma cannot connect to private or local network addresses.': 'Сайт на хостинге не может подключаться к локальным адресам.',
  'AgentRouter connects through the installed Codex client. Its tools are disabled.': 'AgentRouter подключается через установленный клиент Codex. Инструменты клиента отключены.',
  'Enter model IDs from AgentRouter. The connection test verifies the first model.': 'Введите ID моделей из AgentRouter. Проверка подключения проверяет первую модель.',
  'AgentRouter testing sends a short request to the first model and uses API credits.': 'Проверка AgentRouter отправляет короткий запрос первой модели и расходует API-кредиты.',
  'AgentRouter connected through Codex. The model answered:': 'AgentRouter подключён через Codex. Получен ответ модели:',
  'Enter a model ID before testing this connection.': 'Введите ID модели перед проверкой подключения.',
  'Install Codex CLI to use the AgentRouter connection.': 'Для подключения AgentRouter установите клиент Codex CLI.',
  'Tools are disabled for this connection.': 'Инструменты отключены для этого подключения.',
  'The AgentRouter Codex connection accepts photos and text files. Use another provider for PDF documents.': 'Подключение AgentRouter через Codex принимает фото и текстовые файлы. Для PDF используйте другого провайдера.',
  'AgentRouter (Responses)': 'AgentRouter (Responses)', 'OpenAI Responses': 'OpenAI Responses',
  'Test connection': 'Проверить подключение', 'Checking…': 'Проверка…',
  'No chat request is sent and no generation credits are used.': 'Проверяет доступ и список моделей без запроса на генерацию.',
  'Connected. Model discovery and authentication succeeded.': 'Подключение проверено: авторизация и загрузка моделей работают.',
  'Connected. Models not found in the returned list:': 'Подключение работает. В списке провайдера нет моделей:',
  'Provider saved. Use Test connection to verify access.': 'Провайдер сохранён. Проверьте доступ кнопкой «Проверить подключение».',
  'AgentRouter uses Responses for GPT models. Client access must be allowed by the provider.': 'Для GPT в AgentRouter используется Responses. Провайдер должен разрешить доступ этому приложению.',
  'Uses the /responses endpoint.': 'Использует адрес /responses.', 'Uses the selected API format.': 'Использует выбранный формат API.',
  'This provider does not allow this application. Ask its support to enable access for this client.': 'Провайдер не разрешает запросы из этого приложения. Попросите его поддержку включить доступ для этого клиента.',
  'Authentication or access denied. Check the API key and provider permissions.': 'Отказ в авторизации или доступе. Проверьте статус ключа и разрешения провайдера.',
  'The provider could not complete the request.': 'Провайдер не смог выполнить запрос.',
  'The model response was incomplete. Try again or choose another model.': 'Модель не завершила ответ. Повторите запрос или выберите другую модель.',
  'Provider detail:': 'Ответ провайдера:',
  'Choose concise or detailed answers.': 'Выберите краткие или подробные ответы.',
  'Forma — Your AI workspace': 'Forma — ваше пространство ИИ',
  'Workspace navigation': 'Навигация', 'Forma home': 'Главная Forma',
  'Collapse sidebar': 'Свернуть меню', 'Open sidebar': 'Открыть меню', 'Close navigation': 'Закрыть меню',
  'New conversation': 'Новый чат', 'Search conversations': 'Поиск по чатам', 'YOUR CONVERSATIONS': 'ВАШИ ЧАТЫ',
  'A space for your next big idea.': 'Место для ваших новых идей.', 'Your conversations will appear here.': 'Здесь появятся ваши чаты.',
  'Bring your own AI': 'Подключите свой ИИ', 'Connect your favorite models': 'Ваши любимые модели в одном месте', 'Manage your AI connections': 'Управление подключениями ИИ',
  'Settings': 'Настройки', 'Help & shortcuts': 'Помощь и горячие клавиши', 'Your workspace': 'Ваше пространство', 'Personal · stored on this device': 'Личное · на этом устройстве',
  'Choose a model': 'Выбрать модель', 'Add a model in Settings': 'Добавьте модель в настройках', 'Personal workspace': 'Личное пространство',
  'Export conversation': 'Экспорт чата', 'Switch to dark theme': 'Тёмная тема', 'Switch to light theme': 'Светлая тема',
  'YOUR IDEAS. YOUR MODELS.': 'ВАШИ ИДЕИ. ВАШИ МОДЕЛИ.', 'Where ideas take shape.': 'Здесь идеи обретают форму.',
  'A little curiosity can go a long way.': 'Большие идеи начинаются с любопытства.', 'What would you like to explore today?': 'Что хотите узнать сегодня?',
  'Prompt categories': 'Категории запросов', 'Suggested prompts': 'Примеры запросов', 'Write': 'Тексты', 'Learn': 'Учёба', 'Build': 'Код', 'Explore': 'Идеи',
  'One workspace. Any model. All yours.': 'Одно пространство. Любые модели. Всё ваше.',
  'Make yourself at home. Connect a provider to start chatting.': 'Подключите провайдера, чтобы начать общение.', 'Connect provider': 'Подключить',
  'Message': 'Сообщение', 'Conversation': 'Чат', 'Ask anything, or dream up something new…': 'Спросите о чём угодно…', 'Choose your AI': 'Выбрать ИИ',
  'Default style': 'Обычный стиль', 'Default': 'Обычный', 'Concise': 'Кратко', 'Detailed': 'Подробно', 'Creative': 'Творчески',
  'Send message': 'Отправить сообщение', 'Stop generating': 'Остановить ответ', 'AI can make mistakes. Give important details a second look.': 'ИИ может ошибаться. Проверяйте важную информацию.', '↵ to send': '↵ отправить',
  'MAKE IT YOURS': 'НАСТРОЙТЕ ПОД СЕБЯ', 'Workspace settings': 'Настройки пространства', 'Close settings': 'Закрыть настройки',
  'Settings sections': 'Разделы настроек', 'AI providers': 'Провайдеры ИИ', 'Preferences': 'Общие', 'Your data': 'Ваши данные', 'Your workspace lives on this device.': 'Ваши данные хранятся на этом устройстве.',
  'Your AI providers': 'Ваши провайдеры ИИ', 'Different models. One familiar space.': 'Разные модели. Одно удобное пространство.', 'Add a provider, then switch whenever you like.': 'Добавляйте провайдеров и переключайтесь между ними.',
  'Add provider': 'Добавить', 'Your AI workspace starts here': 'Начните с подключения ИИ', 'Connect an API with your URL and key.': 'Укажите URL API и свой ключ.',
  'Use a hosted provider or a model running locally.': 'Подключите облачный сервис или локальную модель.', 'Connect your first provider': 'Подключить провайдера',
  'Keys stay in this browser session unless you choose to remember them. Requests pass through the Forma server to the provider you select.': 'Ключи действуют в текущей сессии браузера, если вы не сохраните их. Запросы проходят через сервер Forma к выбранному провайдеру.',
  'OpenAI-compatible': 'Совместимый с OpenAI', 'Selected': 'Выбран', 'Use provider': 'Выбрать', 'No API key saved': 'Ключ не сохранён',
  'Back to providers': 'Назад к провайдерам', 'Edit provider': 'Изменить провайдера', 'Connect a provider': 'Подключение провайдера',
  'Start with a provider': 'Готовые настройки', 'Custom provider': 'Другой провайдер', 'Ollama (local)': 'Ollama (локально)',
  'Display name': 'Название', 'My AI provider': 'Мой провайдер ИИ', 'API format': 'Формат API', 'API base URL': 'Базовый URL API',
  'Enter the base URL or the full chat endpoint.': 'Введите базовый URL или полный адрес API чата.', 'API key': 'Ключ API', 'Paste your API key': 'Вставьте ключ API',
  'Show API key': 'Показать ключ', 'Hide API key': 'Скрыть ключ', 'Optional for local providers such as Ollama.': 'Для локальных провайдеров, например Ollama, ключ необязателен.',
  'Remember API key on this device': 'Запомнить ключ на этом устройстве', 'Stored in this browser without encryption. Use only on a trusted device.': 'Ключ хранится в браузере без шифрования. Используйте только на доверенном устройстве.',
  'Model names': 'Названия моделей', 'Fetch from provider': 'Загрузить модели', 'Fetching…': 'Загрузка…', 'Enter a model ID, or fetch available models': 'Введите ID модели или загрузите список',
  'One model ID per line, or separated by commas. Use the exact names your provider supports.': 'По одному ID на строку или через запятую. Используйте точные названия моделей провайдера.',
  'Cancel': 'Отмена', 'Save changes': 'Сохранить', 'Close dialog': 'Закрыть окно',
  'Enter a name and a valid HTTP or HTTPS API URL.': 'Введите название и корректный URL API с HTTP или HTTPS.', 'Add at least one model ID, or fetch models from the provider.': 'Введите хотя бы один ID модели или загрузите список.',
  'An API key is required for a hosted provider.': 'Для облачного провайдера нужен ключ API.', 'Enter a valid API URL first.': 'Сначала введите корректный URL API.',
  'No models found. Enter a model ID manually.': 'Модели не найдены. Введите ID вручную.', 'The request timed out.': 'Время ожидания истекло.', 'You can also enter model names manually.': 'Названия моделей также можно ввести вручную.',
  'Provider updated': 'Настройки провайдера обновлены', 'Provider added. You are ready to chat.': 'Провайдер добавлен. Можно начинать чат.', 'Provider removed': 'Провайдер удалён',
  'Remove provider?': 'Удалить провайдера?', 'Remove provider': 'Удалить провайдера', 'Delete conversation?': 'Удалить чат?', 'This conversation will be permanently removed from this device.': 'Этот чат будет навсегда удалён с устройства.', 'Delete conversation': 'Удалить чат',
  'Today': 'Сегодня', 'Earlier': 'Ранее', 'Copied to clipboard': 'Скопировано', 'Clipboard is unavailable in this browser. Select the text to copy it.': 'Буфер обмена недоступен. Выделите текст и скопируйте его.',
  'Copy code': 'Копировать код', 'Copy response': 'Копировать ответ', 'Regenerate response': 'Повторить ответ', 'Response stopped': 'Ответ остановлен', 'Generating response': 'Генерация ответа',
  'CHOOSE YOUR MODEL': 'ВЫБЕРИТЕ МОДЕЛЬ', 'Add a model name in provider settings.': 'Добавьте название модели в настройках провайдера.', 'Your favorite AI, all in one place.': 'Ваши любимые ИИ в одном месте.', 'Connect a provider to choose your model.': 'Подключите провайдера, чтобы выбрать модель.', 'Manage providers': 'Провайдеры',
  'A workspace that fits you': 'Пространство под ваши задачи', 'Set the mood and tell your AI how you like to work.': 'Выберите оформление и настройте ответы ИИ.',
  'Language': 'Язык', 'Choose the interface language.': 'Выберите язык интерфейса.', 'Language updated': 'Язык изменён',
  'Appearance': 'Оформление', 'A little light, or a little less.': 'Светлая или тёмная тема.', 'Light': 'Светлая', 'Dark': 'Тёмная',
  'Response style': 'Стиль ответов', 'The default tone for your conversations.': 'Стиль, который будет использоваться в чатах.', 'Custom instructions': 'Ваши инструкции',
  'What should your AI know about you? How would you like it to respond?': 'Что ИИ должен знать о вас? Как ему отвечать?', 'Included with each new request, across all providers.': 'Добавляются к каждому новому запросу у всех провайдеров.',
  'Save instructions': 'Сохранить инструкции', 'Instructions saved': 'Инструкции сохранены', 'Your data, in your hands': 'Вы управляете своими данными', 'Conversations and preferences are stored in this browser.': 'Чаты и настройки хранятся в этом браузере.',
  'Export conversations': 'Экспорт чатов', 'Export': 'Экспорт', 'Delete all conversations': 'Удалить все чаты', 'Permanently clear your chat history on this device.': 'Навсегда удалить историю чатов с устройства.',
  'Delete all': 'Удалить всё', 'Forget all API keys': 'Удалить все ключи API', 'Keep provider settings, remove saved credentials.': 'Настройки провайдеров сохранятся, ключи будут удалены.', 'Forget keys': 'Удалить ключи',
  'Exported files contain conversation text and model names. API keys are never included. Clearing browser data also removes your saved workspace.': 'Экспорт содержит текст чатов, названия моделей и имена вложений. Ключи API не включаются. Очистка данных браузера удалит и сохранённое пространство.',
  'Delete all conversations?': 'Удалить все чаты?', 'All conversations deleted': 'Все чаты удалены', 'Forget all API keys?': 'Удалить все ключи API?',
  'Your provider settings will stay saved. You will need to enter your keys again to use hosted providers.': 'Настройки провайдеров сохранятся. Для облачных моделей потребуется снова ввести ключи.', 'All API keys forgotten': 'Все ключи API удалены',
  'How should your AI respond?': 'Как должен отвечать ИИ?', 'Let the conversation guide the response.': 'Стиль зависит от вашего запроса.', 'Straight to the point, with the useful essentials.': 'Кратко и по существу.', 'Thorough explanations and concrete examples.': 'Подробные объяснения и примеры.', 'A little imagination. A fresh perspective.': 'Свежие идеи и творческий подход.',
  'Find a conversation': 'Найти чат', 'Search titles and messages…': 'Поиск по названиям и сообщениям…', 'No conversations found. A new idea is a good place to start.': 'Чаты не найдены. Начните с новой идеи.',
  'A space for all your models': 'Место для всех ваших моделей', 'Make yourself at home.': 'Устраивайтесь поудобнее.', 'Forma connects to your AI providers using the credentials you supply.': 'Forma подключается к провайдерам ИИ с вашим URL и ключом API.',
  'Open': 'Откройте', 'Settings → AI providers': 'Настройки → Провайдеры ИИ', 'and add a provider.': 'и добавьте провайдера.', 'Enter its': 'Укажите его', 'API URL, API key, and model ID': 'URL API, ключ API и ID модели', '. You can fetch available model IDs from the provider.': '. Список моделей можно загрузить у провайдера.',
  'Choose a model above the conversation and start chatting.': 'Выберите модель над чатом и начните общение.', 'On phones, tap the send arrow to send. Return adds a new line. The sidebar opens from the top-left button.': 'На телефоне отправляйте сообщения кнопкой со стрелкой. Enter добавляет строку. Меню открывается кнопкой слева вверху.',
  'Send on desktop': 'Отправить на компьютере', 'New line on desktop': 'Новая строка на компьютере', 'Keys stay in this browser session by default. Chats are saved in this browser. Your messages go to the provider you choose.': 'По умолчанию ключи действуют в текущей сессии. Чаты сохраняются в браузере. Сообщения отправляются выбранному провайдеру.',
  'Browser storage is full or unavailable. New changes may not be saved.': 'Хранилище браузера заполнено или недоступно. Новые изменения могут не сохраниться.',
  'Add your API key to this provider to start chatting.': 'Введите ключ API этого провайдера, чтобы начать чат.', 'The provider rejected your API key. Check it in Settings.': 'Провайдер отклонил ключ API. Проверьте его в настройках.',
  'This provider is rate limited or out of credit. Try again later or choose another provider.': 'Превышен лимит запросов или закончились средства. Повторите позже или выберите другого провайдера.',
  'Could not reach this API URL. Check the address and your connection.': 'Не удалось подключиться к API. Проверьте URL и соединение.', 'Could not reach the workspace server. Check that it is running, then try again.': 'Не удалось подключиться к серверу Forma. Проверьте, что он запущен.',
  'The connection ended before the response finished. You can regenerate it.': 'Соединение прервалось до завершения ответа. Попробуйте повторить.', 'The provider connection ended before the response finished. Try regenerating the response.': 'Соединение с провайдером прервалось. Попробуйте повторить ответ.',
  'This model returned no text. Try another chat model.': 'Модель не вернула текст. Выберите другую модель для чата.', 'This conversation is too large. Start a new chat.': 'Чат слишком большой. Начните новый.',
  'Response mode': 'Режим ответа', 'Reasoning effort': 'Усилие модели', 'Effort:': 'Усилие:', 'Low': 'Низкое', 'Medium': 'Среднее', 'High': 'Высокое',
  'Applied to models that support reasoning controls.': 'Действует для моделей с поддержкой настройки рассуждения.',
  'Faster answers for simpler tasks.': 'Быстрые ответы для простых задач.', 'A balance of speed and deeper reasoning.': 'Баланс скорости и глубины рассуждения.',
  'More reasoning for difficult tasks; may take longer.': 'Больше рассуждения для сложных задач; ответ может занять больше времени.',
  'This model has no known effort setting. The level is saved for supported models.': 'Для этой модели настройка усилия не определена. Выбранный уровень сохранён для моделей с поддержкой этой функции.',
  'This model supports high reasoning effort only.': 'Эта модель поддерживает только высокое усилие.',
  'Choose low, medium or high reasoning effort.': 'Выберите низкое, среднее или высокое усилие.',
  'Paste photo': 'Вставить фото', 'From your clipboard': 'Из буфера обмена',
  'Paste a copied photo in the message field with Ctrl+V or your phone’s Paste command.': 'Вставьте скопированное фото в поле сообщения через Ctrl+V или команду «Вставить» на телефоне.',
  'Use Ctrl+V in the message field, or touch and hold it and choose Paste.': 'Нажмите Ctrl+V в поле сообщения или удерживайте поле на телефоне и выберите «Вставить».',
  'Could not read the clipboard. Use Ctrl+V in the message field, or touch and hold it and choose Paste.': 'Не удалось прочитать буфер обмена. Нажмите Ctrl+V в поле сообщения или удерживайте поле на телефоне и выберите «Вставить».',
  'No photo in the clipboard. Copy the image itself, then paste it here.': 'В буфере обмена нет фото. Скопируйте само изображение и вставьте его сюда.',
  'Wait for the files to finish preparing, then paste again.': 'Дождитесь подготовки файлов и повторите вставку.',
  'Add attachments': 'Добавить вложения', 'Attach files': 'Прикрепить файлы', 'Take a photo': 'Сделать фото', 'Photos, PDF and text files': 'Фото, PDF и текстовые файлы',
  'Use your phone camera': 'Снять на камеру телефона',
  'Attachments': 'Вложения', 'Remove attachment': 'Убрать вложение', 'Preparing files…': 'Подготовка файлов…', 'Open attachment': 'Открыть вложение',
  'Up to 5 files. Photos are optimized before sending.': 'До 5 файлов. Фото оптимизируются перед отправкой.', 'Choose a vision model for photos or a PDF-capable model for documents.': 'Для фото нужна модель с поддержкой изображений, для PDF — документов.',
  'Add up to 5 files per message.': 'К сообщению можно добавить до 5 файлов.', 'Each file must be 5 MB or smaller.': 'Размер файла не должен превышать 5 МБ.', 'Attachments must total 8 MB or less.': 'Общий размер вложений не должен превышать 8 МБ.',
  'Supported: JPEG, PNG, WebP, GIF, PDF and text files.': 'Поддерживаются JPEG, PNG, WebP, GIF, PDF и текстовые файлы.', 'This image could not be opened. Try a JPEG or PNG photo.': 'Не удалось открыть изображение. Попробуйте фото в JPEG или PNG.',
  'Text files must be 500 KB or smaller.': 'Текстовый файл не должен превышать 500 КБ.', 'This file is not readable text.': 'Этот файл не содержит читаемого текста.',
  'Browser file storage is unavailable. Allow site storage to attach files.': 'Хранилище файлов недоступно. Разрешите сайту сохранять данные.', 'An attachment is no longer available on this device. Attach it again in a new message.': 'Вложение больше не доступно на устройстве. Прикрепите его снова в новом сообщении.',
  'Analyze the attached files.': 'Проанализируй прикреплённые файлы.', 'Files are sent to your selected provider with the conversation.': 'Файлы отправляются выбранному провайдеру вместе с перепиской.',
  'Find the right words': 'Найдите нужные слова', 'Turn a rough idea into something great': 'Превратите набросок в готовый текст', 'An email, but better': 'Письмо без лишних слов', 'Make your message sound like you': 'Сохраните свой стиль общения',
  'A fresh perspective': 'Свежий взгляд', 'Bring a new angle to your story': 'Найдите новый подход к истории', 'Make it more you': 'Текст в вашем стиле', 'Polish your writing, keep your voice': 'Улучшите текст, сохранив свой голос',
  'Make it click': 'Разберитесь в сложном', 'Understand something complex, simply': 'Сложные вещи простыми словами', 'Follow your curiosity': 'Следуйте любопытству', 'Ask the questions behind the questions': 'Узнайте больше через вопросы',
  'Build a learning plan': 'План обучения', 'Small steps toward a new skill': 'Небольшие шаги к новому навыку', 'Practice a language': 'Практика языка', 'A conversation that helps you grow': 'Разговор, который помогает учиться',
  'From idea to code': 'От идеи к коду', 'Get a hand with your next project': 'Помощь с вашим новым проектом', 'Untangle a bug': 'Разберитесь с ошибкой', 'Find what is going wrong, and why': 'Найдите причину и решение',
  'Think through a system': 'Продумайте систему', 'Give your big idea a solid foundation': 'Надёжная основа для вашей идеи', 'Ship something useful': 'Создайте полезный проект', 'Break your next project into steps': 'Разбейте проект на понятные шаги',
  'Somewhere new': 'Новые места', 'Plan a trip that feels like you': 'Спланируйте поездку по душе', 'A better everyday': 'Лучше каждый день', 'Make a little room for what matters': 'Найдите время для важного',
  'What if…': 'А что, если…', 'See where an unexpected idea leads': 'Посмотрите, куда приведёт новая идея', 'Connect the dots': 'Найдите взаимосвязи', 'Discover something worth thinking about': 'Откройте что-то интересное',
  'Help me turn a rough idea into a clear, compelling piece of writing. Start by asking me about the idea and who it is for.': 'Помоги превратить мою идею в понятный и убедительный текст. Сначала спроси, в чём идея и для кого я пишу.',
  'Help me write an email that sounds natural and gets my point across. Ask me who it is for, what I need to say, and the tone I want.': 'Помоги написать естественное и понятное письмо. Спроси, кому оно адресовано, что я хочу сказать и какой нужен тон.',
  'Help me brainstorm three fresh angles for a story. Ask me about the topic, audience, and what I have already tried.': 'Помоги придумать три новых подхода к истории. Спроси о теме, аудитории и том, что я уже пробовал.',
  'Help me polish a piece of writing while preserving my voice. Ask me to share the draft and what I would like to improve.': 'Помоги улучшить текст, сохранив мой стиль. Попроси прислать черновик и уточни, что я хочу улучшить.',
  'Help me understand a complex topic using simple explanations and concrete examples. Ask me what topic I want to learn and what I already know.': 'Объясни сложную тему простыми словами и с примерами. Спроси, что я хочу изучить и что уже знаю.',
  'Guide me through an interesting subject with questions that help me discover the answers. Ask me what I am curious about.': 'Помоги изучить интересную тему через вопросы, чтобы я сам находил ответы. Спроси, что меня интересует.',
  'Help me build a realistic learning plan for a new skill. Ask me about the skill, my experience, and the time I can commit.': 'Помоги составить реалистичный план освоения навыка. Спроси о навыке, моём опыте и доступном времени.',
  'Be my language conversation partner. Ask which language I am learning and my level, then help me practice with gentle corrections.': 'Будь моим собеседником для практики языка. Спроси о языке и моём уровне, затем помогай практиковаться и мягко исправляй ошибки.',
  'Help me turn a project idea into working code. Ask about the project, my preferred language, and the first feature I want to build.': 'Помоги превратить идею проекта в работающий код. Спроси о проекте, языке программирования и первой функции.',
  'Help me debug a problem step by step. Ask me for the relevant code, the error, and the behavior I expected.': 'Помоги пошагово исправить ошибку. Попроси код, сообщение об ошибке и описание ожидаемого поведения.',
  'Help me think through the architecture of a software system. Ask what it should do, how many users it will have, and my constraints.': 'Помоги продумать архитектуру системы. Спроси о её задачах, числе пользователей и ограничениях.',
  'Help me scope a small, useful project and break it into achievable steps. Ask about my idea and available time.': 'Помоги спланировать небольшой полезный проект и разбить его на шаги. Спроси об идее и доступном времени.',
  'Help me plan a thoughtful trip. Ask about the destination, dates, budget, and what I enjoy doing.': 'Помоги спланировать поездку. Спроси о месте, датах, бюджете и моих интересах.',
  'Help me improve my daily routine in a realistic way. Ask about my current routine and the one thing I most want to change.': 'Помоги улучшить мой распорядок дня. Спроси о текущем режиме и том, что я больше всего хочу изменить.',
  'Let us explore a creative what-if scenario together. Offer three intriguing starting points and let me choose one.': 'Давай вместе исследуем творческий сценарий «А что, если…». Предложи три интересных варианта и дай мне выбрать.',
  'Introduce me to an interesting connection between two seemingly unrelated subjects. Ask about my interests first.': 'Расскажи об интересной связи между двумя, казалось бы, разными темами. Сначала спроси о моих интересах.'
};
export function t(source) {
  if (language !== 'ru') return source;
  if (ru[source]) return ru[source];
  if (source.includes(' (HTTP ')) { const split = source.indexOf(' (HTTP '); return t(source.slice(0, split)) + source.slice(split).replace('Provider detail:', 'Ответ провайдера:'); }
  let m;
  if ((m = /^(\d+) providers? connected$/.exec(source))) return `Подключено: ${m[1]}`;
  if ((m = /^(.+) · (\d+) models?$/.exec(source))) return `${t(m[1])} · моделей: ${m[2]}`;
  if ((m = /^(\d+) models found$/.exec(source))) return `Найдено моделей: ${m[1]}`;
  if ((m = /^Using (.+)$/.exec(source))) return `Выбран провайдер: ${m[1]}`;
  if ((m = /^Download (\d+) conversations? as a JSON file\.$/.exec(source))) return `Скачать чаты в JSON: ${m[1]}.`;
  if ((m = /^Remove (.+) and its saved API key\? Your conversations will stay on this device\.$/.exec(source))) return `Удалить ${m[1]} и сохранённый ключ API? Чаты останутся на устройстве.`;
  if ((m = /^This will permanently delete (\d+) conversations from this device\. Export them first if you want to keep a copy\.$/.exec(source))) return `Все чаты (${m[1]}) будут удалены с устройства. Сначала экспортируйте их, если нужна копия.`;
  if ((m = /^(Edit|Remove|Delete) (.+)$/.exec(source))) return `${{ Edit: 'Изменить', Remove: 'Удалить', Delete: 'Удалить' }[m[1]]} ${m[2]}`;
  if (source.includes(' You can also enter model names manually.')) return source.split(' You can also enter model names manually.').map(t).join(' Названия моделей также можно ввести вручную.');
  return source;
}
const original = new WeakMap();
const excluded = '[data-user-content],.user-bubble,.message-content,.provider-card-details,.provider-initial,.search-result,#active-provider-label,#active-model-label,#composer-provider-name,#provider-models,script,style';
function replace(node, value, read, write) { let record = original.get(node); if (!record) { record = {}; original.set(node, record); } const prev = record[value]; const current = read(); const source = prev && prev.last === current ? prev.source : current; const trimmed = source.trim(); const translated = source.replace(trimmed, t(trimmed)); record[value] = { source, last: translated }; if (current !== translated) write(translated); }
export function translate(root = document.body) {
  if (!root || root.nodeType !== 1 || root.closest(excluded)) return;
  const elements = [root, ...root.querySelectorAll('*')];
  for (const element of elements) {
    if (element.closest(excluded)) continue;
    for (const attr of ['aria-label', 'placeholder', 'title']) if (element.hasAttribute(attr)) replace(element, attr, () => element.getAttribute(attr), text => element.setAttribute(attr, text));
    for (const node of element.childNodes) if (node.nodeType === 3 && node.textContent.trim()) replace(node, 'text', () => node.textContent, text => { node.textContent = text; });
  }
}
export function installTranslations() {
  setLanguage(language); translate();
  new MutationObserver(records => {
    const roots = new Set();
    for (const record of records) { const root = record.target.nodeType === 1 ? record.target : record.target.parentElement; if (root && !root.closest(excluded)) roots.add(root); }
    for (const root of roots) if (root.isConnected) translate(root);
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'placeholder', 'title'] });
}
