(function() {
  'use strict';

  const form = document.getElementById('broadcasterFeedbackForm');
  const submitBtn = document.getElementById('submitFeedbackBtn');
  const copyBtn = document.getElementById('copyFeedbackBtn');
  const message = document.getElementById('formMessage');
  let lastPayload = null;

  if (!form) return;

  function selectedValues(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`))
      .map(input => input.value);
  }

  function selectedValue(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || '';
  }

  function showMessage(type, text) {
    message.className = `rounded p-3 text-sm ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`;
    message.textContent = text;
    message.classList.remove('hidden');
  }

  function requireAtLeastOne(name, label) {
    if (selectedValues(name).length > 0) return true;
    showMessage('error', `חסר מענה בשאלה: ${label}`);
    return false;
  }

  function buildPayload() {
    return {
      full_name: form.fullName.value.trim(),
      frequency: selectedValue('frequency'),
      used_sections: selectedValues('usedSections'),
      help_rating: Number(selectedValue('helpRating')),
      most_useful: form.mostUseful.value.trim(),
      blockers: form.blockers.value.trim(),
      ideas: form.ideas.value.trim(),
      page_url: window.location.href,
      user_agent: navigator.userAgent
    };
  }

  function validatePayload(payload) {
    if (!payload.full_name) {
      showMessage('error', 'נא למלא שם מלא.');
      form.fullName.focus();
      return false;
    }

    if (!payload.frequency) {
      showMessage('error', 'נא לבחור תדירות שימוש.');
      return false;
    }

    if (!requireAtLeastOne('usedSections', 'באילו חלקים השתמשת בעיקר?')) return false;

    if (!payload.help_rating) {
      showMessage('error', 'נא לבחור דירוג עד כמה המערכת עזרה לך.');
      return false;
    }

    if (!payload.most_useful) {
      showMessage('error', 'נא למלא מה היה הכי שימושי עבורך.');
      form.mostUseful.focus();
      return false;
    }

    return true;
  }

  function payloadToText(payload) {
    return [
      `שם מלא: ${payload.full_name}`,
      `תדירות שימוש: ${payload.frequency}`,
      `חלקים בשימוש: ${payload.used_sections.join(', ')}`,
      `דירוג עזרה: ${payload.help_rating}`,
      `הכי שימושי: ${payload.most_useful}`,
      `מה האט הכנה: ${payload.blockers || '-'}`,
      `רעיונות נוספים: ${payload.ideas || '-'}`
    ].join('\n');
  }

  copyBtn?.addEventListener('click', async () => {
    if (!lastPayload) return;
    await navigator.clipboard.writeText(payloadToText(lastPayload));
    showMessage('success', 'התשובה הועתקה. אפשר לשלוח אותה ידנית אם השליחה האוטומטית לא עבדה.');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.classList.add('hidden');

    const payload = buildPayload();
    lastPayload = payload;

    if (!validatePayload(payload)) {
      copyBtn.classList.remove('hidden');
      return;
    }

    if (!window.supabaseClient) {
      showMessage('error', 'לא ניתן לשלוח כרגע: החיבור ל-Supabase לא נטען. אפשר להעתיק את התשובה ולשלוח ידנית.');
      copyBtn.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'שולח...';

    try {
      const { error } = await window.supabaseClient
        .from('broadcaster_feedback')
        .insert(payload);

      if (error) throw error;

      form.reset();
      showMessage('success', 'תודה רבה! המשוב שלך יעזור לנו לשפר את המערכת לקראת העונה הבאה.');
      copyBtn.classList.add('hidden');
    } catch (error) {
      console.error('Feedback submit failed:', error);
      showMessage('error', 'לא הצלחנו לשלוח את המשוב. אם זו הפעם הראשונה שמפעילים את הטופס, צריך להריץ את קובץ ה-SQL המצורף ב-Supabase.');
      copyBtn.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'שליחת משוב';
    }
  });
})();
