const elements = {
  apiBase: document.getElementById('apiBase'),
  model: document.getElementById('model'),
  apiKey: document.getElementById('apiKey'),
  highInput: document.getElementById('highInput'),
  lowInput: document.getElementById('lowInput'),
  highPreview: document.getElementById('highPreview'),
  lowPreview: document.getElementById('lowPreview'),
  highMemo: document.getElementById('highMemo'),
  lowMemo: document.getElementById('lowMemo'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  result: document.getElementById('result'),
};

let highDataUrl = '';
let lowDataUrl = '';

function bindImage(input, preview, setter) {
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) {
      preview.removeAttribute('src');
      setter('');
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    preview.src = dataUrl;
    setter(dataUrl);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

function buildPrompt() {
  return [
    '당신은 퍼포먼스 마케팅 크리에이티브 전략가입니다.',
    '좌측 이미지(고효율)와 우측 이미지(저효율)를 비교해 광고 성과 차이를 분석하세요.',
    '다음 구조를 지켜 한국어로 작성하세요:',
    '1) 핵심 차이점 5개 (메시지/시각 요소/오퍼/CTA 관점)',
    '2) 저효율 원인 가설 3개',
    '3) 즉시 적용 가능한 개선안 5개',
    '4) 다음 실험 A/B 테스트 3개 (가설, 변경점, 기대지표)',
    '모호한 부분은 명확히 "가설"로 표시하세요.',
  ].join('\n');
}

async function runAnalysis() {
  const apiBase = elements.apiBase.value.trim().replace(/\/$/, '');
  const model = elements.model.value.trim();
  const apiKey = elements.apiKey.value.trim();

  if (!apiKey) {
    throw new Error('API Key를 입력해주세요.');
  }

  if (!highDataUrl || !lowDataUrl) {
    throw new Error('고효율/저효율 이미지 모두 업로드해주세요.');
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '당신은 광고 크리에이티브 성과 분석 전문가입니다.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildPrompt() },
            {
              type: 'text',
              text: `고효율 소재 메모: ${elements.highMemo.value.trim() || '없음'}`,
            },
            {
              type: 'image_url',
              image_url: { url: highDataUrl },
            },
            {
              type: 'text',
              text: `저효율 소재 메모: ${elements.lowMemo.value.trim() || '없음'}`,
            },
            {
              type: 'image_url',
              image_url: { url: lowDataUrl },
            },
          ],
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API 호출 실패 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const output = data?.choices?.[0]?.message?.content;

  if (!output) {
    throw new Error('AI 응답이 비어 있습니다.');
  }

  return output;
}

elements.analyzeBtn.addEventListener('click', async () => {
  elements.analyzeBtn.disabled = true;
  elements.result.textContent = '분석 중입니다...';

  try {
    const analysis = await runAnalysis();
    elements.result.textContent = analysis;
  } catch (error) {
    elements.result.textContent = `오류: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    elements.analyzeBtn.disabled = false;
  }
});

bindImage(elements.highInput, elements.highPreview, (value) => {
  highDataUrl = value;
});

bindImage(elements.lowInput, elements.lowPreview, (value) => {
  lowDataUrl = value;
});
