document.addEventListener('DOMContentLoaded', () => {
  const auditForm = document.getElementById('audit-form');
  const urlInput = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  
  const loaderState = document.getElementById('loader-state');
  const loadingUrlDisplay = document.getElementById('loading-url');
  
  const errorCard = document.getElementById('error-card');
  const errorMessage = document.getElementById('error-message');
  
  const resultsPanel = document.getElementById('results-panel');
  const resultUrl = document.getElementById('result-url');
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const responseTimeText = document.getElementById('response-time-text');
  
  // Metric Cards and Values
  const metaTitleVal = document.getElementById('meta-title-val');
  const titleLengthText = document.getElementById('title-length-text');
  const titleBadge = document.getElementById('title-badge');
  const titleRec = document.getElementById('title-rec');
  
  const metaDescVal = document.getElementById('meta-desc-val');
  const descLengthText = document.getElementById('desc-length-text');
  const descBadge = document.getElementById('desc-badge');
  const descRec = document.getElementById('desc-rec');
  
  const h1CountVal = document.getElementById('h1-count-val');
  const h1Badge = document.getElementById('h1-badge');
  const h1Rec = document.getElementById('h1-rec');
  
  const wordCountVal = document.getElementById('word-count-val');
  const wordsBadge = document.getElementById('words-badge');
  const wordsRec = document.getElementById('words-rec');
  
  const imgTotalVal = document.getElementById('img-total-val');
  const imgMissingVal = document.getElementById('img-missing-val');
  const imagesBadge = document.getElementById('images-badge');
  const missingSourcesList = document.getElementById('missing-sources-list');

  // Submit Handler
  auditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) return;

    // Enforce prepending protocol if user types 'example.com' directly
    let targetUrl = rawUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
      urlInput.value = targetUrl;
    }

    // Reset View States
    errorCard.classList.add('hidden');
    resultsPanel.classList.add('hidden');
    
    // Trigger Loading State
    loaderState.classList.remove('hidden');
    loadingUrlDisplay.textContent = targetUrl;
    submitBtn.disabled = true;
    
    try {
      // Dynamically target backend server if running local static host (like Live Server or file)
      const host = window.location.hostname;
      const port = window.location.port;
      const apiBase = (host === 'localhost' || host === '127.0.0.1') && port !== '3000'
        ? 'http://localhost:3000'
        : '__RENDER_BACKEND_URL__';

      // Call backend API endpoint
      const response = await fetch(`${apiBase}/api/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete audit request.');
      }

      // Success Path -> Render Report
      renderReport(targetUrl, data);
      
    } catch (err) {
      console.error(err);
      // Show Error State
      errorMessage.textContent = err.message || 'An unexpected error occurred. Please verify your connection and try again.';
      errorCard.classList.remove('hidden');
      errorCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      // Cleanup Loading State
      loaderState.classList.add('hidden');
      submitBtn.disabled = false;
    }
  });

  /**
   * Populates the frontend dashboard with report statistics
   */
  function renderReport(url, data) {
    resultUrl.textContent = url;
    resultUrl.title = url; // tooltip
    
    // 1. Status Badge Configuration
    statusBadge.className = 'status-badge'; // Reset classes
    if (data.statusCode >= 200 && data.statusCode < 300) {
      statusBadge.classList.add('success');
      statusText.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${data.statusCode} OK`;
    } else if (data.statusCode >= 300 && data.statusCode < 400) {
      statusBadge.classList.add('warning');
      statusText.innerHTML = `<i class="fa-solid fa-circle-right"></i> ${data.statusCode} Redirect`;
    } else {
      statusBadge.classList.add('danger');
      statusText.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.statusCode} Error`;
    }

    // 2. Response Time Display
    responseTimeText.textContent = `${data.responseTimeMs} ms`;

    // 3. Page Title Audit
    const title = data.title || '';
    metaTitleVal.textContent = title || 'No Title Found';
    if (!title) {
      metaTitleVal.classList.add('italic-placeholder');
      titleLengthText.textContent = 'Length: 0 characters';
      titleBadge.className = 'badge action';
      titleBadge.textContent = 'Action Required';
      titleRec.textContent = 'Title tag is missing! Add a title tag inside the <head> element to establish search identity.';
    } else {
      metaTitleVal.classList.remove('italic-placeholder');
      const len = title.length;
      titleLengthText.textContent = `Length: ${len} character${len !== 1 ? 's' : ''}`;
      
      if (len >= 30 && len <= 60) {
        titleBadge.className = 'badge healthy';
        titleBadge.textContent = 'Healthy';
        titleRec.textContent = 'Title tag length is optimal for display on search engine results pages (SERPs).';
      } else if (len < 30) {
        titleBadge.className = 'badge warning';
        titleBadge.textContent = 'Warning';
        titleRec.textContent = 'Title is too short. Expand title to 30–60 characters to include rich contextual keywords.';
      } else {
        titleBadge.className = 'badge warning';
        titleBadge.textContent = 'Warning';
        titleRec.textContent = 'Title exceeds 60 characters. Search engines will truncate it in results listings.';
      }
    }

    // 4. Meta Description Audit
    const desc = data.metaDescription || '';
    metaDescVal.textContent = desc || 'No description meta tag found in HTML header.';
    if (!desc) {
      metaDescVal.classList.add('italic-placeholder');
      descLengthText.textContent = 'Length: 0 characters';
      descBadge.className = 'badge action';
      descBadge.textContent = 'Action Required';
      descRec.textContent = 'Description is missing. Search bots will generate excerpt content dynamically, which might look unstructured.';
    } else {
      metaDescVal.classList.remove('italic-placeholder');
      const len = desc.length;
      descLengthText.textContent = `Length: ${len} character${len !== 1 ? 's' : ''}`;
      
      if (len >= 110 && len <= 160) {
        descBadge.className = 'badge healthy';
        descBadge.textContent = 'Healthy';
        descRec.textContent = 'Meta description length is optimal for search snippet visual preview.';
      } else if (len < 110) {
        descBadge.className = 'badge warning';
        descBadge.textContent = 'Warning';
        descRec.textContent = 'Description is short. Ideal length is 110-160 characters to leverage keyword summaries.';
      } else {
        descBadge.className = 'badge warning';
        descBadge.textContent = 'Warning';
        descRec.textContent = 'Description exceeds 160 characters. Excess characters will be hidden in web results.';
      }
    }

    // 5. H1 Headers Count Audit
    const h1Count = data.h1Count || 0;
    h1CountVal.textContent = h1Count;
    if (h1Count === 1) {
      h1Badge.className = 'badge healthy';
      h1Badge.textContent = 'Healthy';
      h1Rec.textContent = 'Exactly one <h1> element found, which is ideal for structuring your main header and layout.';
    } else if (h1Count === 0) {
      h1Badge.className = 'badge action';
      h1Badge.textContent = 'Action Required';
      h1Rec.textContent = 'Missing <h1> element! Create exactly one <h1> element on the page containing the main topic.';
    } else {
      h1Badge.className = 'badge warning';
      h1Badge.textContent = 'Warning';
      h1Rec.textContent = `Multiple (${h1Count}) <h1> tags found. Consolidate to a single <h1> and convert secondary headers to <h2> or <h3> tags.`;
    }

    // 6. Word Count Audit
    const wordCount = data.wordCount || 0;
    wordCountVal.textContent = wordCount.toLocaleString();
    if (wordCount >= 300) {
      wordsBadge.className = 'badge healthy';
      wordsBadge.textContent = 'Healthy';
      wordsRec.textContent = 'Word count is excellent. The page contains enough content body for robust search indexing.';
    } else if (wordCount > 0 && wordCount < 300) {
      wordsBadge.className = 'badge warning';
      wordsBadge.textContent = 'Warning';
      wordsRec.textContent = 'Thin content detected. Increase structural text content above 300 words to enhance page topical relevance.';
    } else {
      wordsBadge.className = 'badge action';
      wordsBadge.textContent = 'Action Required';
      wordsRec.textContent = 'No text content identified. Ensure indexable text content is readable (not completely embedded inside images or scripts).';
    }

    // 7. Image Alt Audit & List Rendering
    const imgTotal = data.images.total || 0;
    const imgMissing = data.images.missingAlt || 0;
    imgTotalVal.textContent = imgTotal;
    imgMissingVal.textContent = imgMissing;
    
    // Clear list
    missingSourcesList.innerHTML = '';
    
    if (imgTotal === 0) {
      imagesBadge.className = 'badge healthy';
      imagesBadge.textContent = 'Healthy';
      const emptyLi = document.createElement('li');
      emptyLi.textContent = 'No images detected on this page.';
      emptyLi.style.borderLeftColor = 'var(--color-success)';
      missingSourcesList.appendChild(emptyLi);
    } else if (imgMissing === 0) {
      imagesBadge.className = 'badge healthy';
      imagesBadge.textContent = 'Healthy';
      const successLi = document.createElement('li');
      successLi.textContent = 'Excellent! All images contain alt tags.';
      successLi.style.borderLeftColor = 'var(--color-success)';
      missingSourcesList.appendChild(successLi);
    } else {
      imagesBadge.className = 'badge action';
      imagesBadge.textContent = 'Action Required';
      
      data.images.missingAltSources.forEach(src => {
        const li = document.createElement('li');
        li.textContent = src;
        li.title = src; // tooltip
        missingSourcesList.appendChild(li);
      });
      
      if (imgMissing > data.images.missingAltSources.length) {
        const extraLi = document.createElement('li');
        extraLi.textContent = `... and ${imgMissing - data.images.missingAltSources.length} more image(s)`;
        extraLi.style.fontStyle = 'italic';
        extraLi.style.color = 'var(--text-muted)';
        extraLi.style.borderLeftColor = 'var(--text-muted)';
        missingSourcesList.appendChild(extraLi);
      }
    }

    // Reveal Results and scroll
    resultsPanel.classList.remove('hidden');
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
