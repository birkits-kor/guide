(function () {
  'use strict';
  const $ = id => document.getElementById(id), api = window.BirkitsOrderApi;
  const token = location.hash.slice(1), form = $('orderForm');
  let quote, submitted = null;
  const draftKey = 'birkits-purchase-draft:' + token;
  const draftFields = ['name', 'phone', 'email', 'postcode', 'address', 'addressDetail', 'deliveryRequest', 'payerName'];
  function saveDraft() {
    if (submitted) return;
    const draft = { differentPayer: $('differentPayer').checked, consent: form.elements.consent.checked, fields: {} };
    draftFields.forEach(name => { draft.fields[name] = form.elements[name].value; });
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); } catch (_) {}
  }
  function restoreDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (!draft?.fields) return;
      draftFields.forEach(name => { if (typeof draft.fields[name] === 'string') form.elements[name].value = draft.fields[name].slice(0, form.elements[name].maxLength > 0 ? form.elements[name].maxLength : 1000); });
      $('differentPayer').checked = draft.differentPayer === true; $('payerField').hidden = !$('differentPayer').checked; form.elements.payerName.required = $('differentPayer').checked;
      form.elements.consent.checked = draft.consent === true;
    } catch (_) {}
  }
  const money = value => Math.round(Number(value) || 0).toLocaleString('ko-KR') + '원';
  function status(message, error = false) { $('formStatus').textContent = message; $('formStatus').classList.toggle('error', error); }
  function requestId() {
    const key = 'birkits-purchase-request:' + token;
    try { let id = sessionStorage.getItem(key); if (!id) { id = api.randomId(); sessionStorage.setItem(key, id); } return id; }
    catch (_) { return api.randomId(); }
  }
  const clientId = requestId();
  function showQuote(value) {
    quote = value; $('quoteId').textContent = quote.id;
    $('quoteTitle').textContent = `${quote.selection.model === 'shuve' ? '슈브' : '마베드'} ${quote.selection.size} · ${quote.selection.finish}`;
    $('quoteDetailsLabel').textContent = `선택한 구성 ${quote.lines.length}개 자세히 보기`;
    const container = $('quoteLines'); container.replaceChildren();
    for (const line of quote.lines) {
      const row = document.createElement('div'), copy = document.createElement('div'), title = document.createElement('strong'), detail = document.createElement('small'), price = document.createElement('span');
      row.className = 'quote-line'; title.textContent = line.label; detail.textContent = line.detail; price.textContent = money(line.price); copy.append(title, detail); row.append(copy, price); container.append(row);
    }
    $('quoteTotal').textContent = money(quote.total);
    $('quoteSize').textContent = `예상 설치 크기 · 가로 ${quote.dimensions.width} × 세로 ${quote.dimensions.depth}cm`;
    const shuve = quote.selection.model === 'shuve';
    $('productDetail').href = 'https://birkits.com/product/detail.html?product_no=' + (shuve ? '49' : '48');
    $('productDetail').textContent = (shuve ? '슈브' : '마베드') + ' 상세페이지 보기 ↗';
    $('loading').hidden = true; $('content').hidden = false;
  }
  async function load() {
    try {
      if (!/^[a-f0-9]{40}$/.test(token)) throw new Error('받으신 견적 링크로 접속해 주세요.');
      const result = await api.request('guideGetQuote', { token }); showQuote(result.quote); restoreDraft();
    } catch (error) { $('loading').hidden = true; $('error').hidden = false; $('errorText').textContent = error.message || '견적을 불러오지 못했습니다.'; }
  }
  $('copyAccount').addEventListener('click', async () => {
    const value = '신한은행 597-04-532966\n하영웅(버킷츠)';
    if (await api.copy(value)) $('copyStatus').textContent = '계좌 정보를 복사했습니다.';
    else { $('accountText').hidden = false; $('accountText').focus(); $('accountText').select(); $('copyStatus').textContent = '위 내용을 길게 눌러 복사해 주세요.'; }
  });
  form.elements.phone.addEventListener('input', event => {
    const raw = event.target.value.replace(/\D/g, '').slice(0, 11);
    event.target.value = raw.length <= 3 ? raw : raw.length <= 7 ? raw.slice(0, 3) + '-' + raw.slice(3) : raw.slice(0, 3) + '-' + raw.slice(3, raw.length - 4) + '-' + raw.slice(-4);
  });
  form.elements.postcode.addEventListener('input', event => event.target.value = event.target.value.replace(/\D/g, '').slice(0, 5));
  $('differentPayer').addEventListener('change', () => { $('payerField').hidden = !$('differentPayer').checked; form.elements.payerName.required = $('differentPayer').checked; });
  $('searchAddress').addEventListener('click', () => {
    if (!window.daum?.Postcode) { status('주소 검색을 불러오지 못했습니다. 우편번호와 주소를 직접 입력해 주세요.', true); form.elements.postcode.focus(); return; }
    $('postcodeWrap').hidden = false;
    new daum.Postcode({ width: '100%', height: '100%', oncomplete(data) { form.elements.postcode.value = data.zonecode; form.elements.address.value = data.roadAddress || data.jibunAddress; $('postcodeWrap').hidden = true; form.elements.addressDetail.focus(); saveDraft(); } }).embed($('postcodeEmbed'));
  });
  $('closeAddress').addEventListener('click', () => $('postcodeWrap').hidden = true);
  function payload() {
    const values = Object.fromEntries(new FormData(form));
    return { token, requestId: clientId, expectedTotal: quote.total, consent: form.elements.consent.checked, website: values.website || '', customer: { name: values.name, phone: values.phone, email: values.email, postcode: values.postcode, address: values.address, addressDetail: values.addressDetail, deliveryRequest: values.deliveryRequest, payerName: $('differentPayer').checked ? values.payerName : values.name } };
  }
  async function send(data) {
    const button = $('purchaseButton');
    if (form.dataset.busy === 'true') return;
    form.dataset.busy = 'true'; button.disabled = true; $('retryMail').disabled = true; button.textContent = '신청을 접수하고 있습니다…'; status('화면을 닫지 말고 잠시 기다려 주세요.');
    try {
      const result = await api.request('guideSubmitOrder', data);
      submitted = data; form.hidden = true; $('success').hidden = false; $('orderNumber').textContent = '주문번호 · ' + result.orderId;
      try { sessionStorage.removeItem(draftKey); } catch (_) {}
      const hasEmail = Boolean(data.customer.email?.trim());
      $('successText').textContent = result.emailSent ? (hasEmail ? '입력하신 이메일로 신청 내역을 보내드렸습니다.' : '문의 시 위 주문번호를 알려주세요.') : (hasEmail ? '신청은 접수되었습니다. 안내 메일 발송이 지연되고 있습니다. 아래 버튼으로 다시 받아 주세요.' : '신청은 접수되었습니다. 접수 알림이 지연되고 있습니다. 아래 버튼으로 다시 요청해 주세요.');
      $('retryMail').textContent = hasEmail ? '안내 메일 다시 받기' : '접수 알림 다시 요청';
      $('retryMail').hidden = result.emailSent; status(''); $('success').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { status(error.message || '접수를 확인하지 못했습니다. 같은 화면에서 다시 눌러 주세요.', true); }
    finally { form.dataset.busy = ''; button.disabled = false; $('retryMail').disabled = false; button.textContent = '구매 신청하기'; }
  }
  form.addEventListener('submit', async event => { event.preventDefault(); if (quote && form.reportValidity()) await send(payload()); });
  $('retryMail').addEventListener('click', () => { if (submitted) send(submitted); });
  form.addEventListener('input', saveDraft); form.addEventListener('change', saveDraft);
  window.addEventListener('pagehide', saveDraft);
  window.addEventListener('hashchange', () => location.reload());
  load();
})();
