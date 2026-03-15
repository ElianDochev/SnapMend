# Frontend TODO

The frontend should treat the backend as same-origin and call only `/api/...`.

## Required user input flow

The analyze form must require:

- one photo
- and either a text prompt or a voice recording

Valid combinations:

- photo + text
- photo + voice
- photo + text + voice

Invalid combinations:

- text only
- voice only
- photo only

The UI should block submission until the user has uploaded a photo and also provided at least one of text or voice.

## Main API call

Use `POST /api/analyze` with `multipart/form-data`.

Form fields:

- `title`: `string`
- `description`: `string` optional
- `image`: file required
- `audio`: file optional

Suggested frontend rule:

- If the user typed a prompt, send it in `description`
- If the user recorded a voice note, send it in `audio`
- Always send a short generated title such as `"Cabinet hinge problem"` or let the user type one

Example request shape:

```ts
const formData = new FormData();
formData.append('title', 'Cabinet hinge problem');
formData.append('description', userTextPrompt);
formData.append('image', imageFile);

if (audioFile) {
  formData.append('audio', audioFile);
}

const response = await fetch('/api/analyze', {
  method: 'POST',
  body: formData,
});
```

## `POST /api/analyze` response schema

Response body:

```ts
type ProductOption = {
  title: string;
  storeName: string;
  productUrl: string;
};

type ProductRecommendation = {
  item: string;
  whyItIsNeeded: string;
  searchSummary: string;
  options: ProductOption[];
};

type RepairCase = {
  id: string;
  createdAt: string;
  title: string;
  description?: string;
  transcript?: string;
  issueEvidence: {
    fromImage: string;
    fromUserDescription: string;
    fromVoiceTranscript?: string;
  };
  inputSummary: {
    imageProvided: boolean;
    audioProvided: boolean;
  };
  diagnosis: string;
  safetyWarning: string;
  steps: string[];
  materials: string[];
  costEstimate: string;
  nextAction: string;
  productRecommendations: ProductRecommendation[];
};
```

Frontend rendering priorities:

- show `diagnosis`
- show `issueEvidence`
- show `safetyWarning`
- render `steps` as an ordered list
- render `materials`
- render `productRecommendations` as cards with store links
- if `transcript` exists, optionally show it in an expandable section

## Other API calls

### `GET /api/health`

Response:

```ts
type HealthResponse = {
  status: 'ok';
};
```

Use this only for simple health checks or loading-state diagnostics if needed.

### `GET /api/cases`

Response:

```ts
type CasesResponse = RepairCase[];
```

Use this for a history screen.

### `GET /api/cases/:id`

Response:

```ts
type CaseResponse = RepairCase;
```

Use this for a detail page or when the app needs to reload one previous analysis.

## Validation and UX notes

- Require an image before the submit button is enabled.
- Require at least one of text or voice before the submit button is enabled.
- Show upload progress and an analyzing state, because the request may take time due to transcription, image analysis, and product lookup.
- Handle non-200 responses by showing the backend error message if one is returned.
- If audio is recorded in the browser, submit the file directly as `audio`; the backend accepts supported transcription formats such as `.m4a`.
- Product links are external links and should open in a new tab.

## Minimal frontend implementation order

1. Build the submit form with photo upload, text prompt, and voice recording.
2. Enforce `photo + (text or voice)` validation before submit.
3. Call `POST /api/analyze`.
4. Render the returned `RepairCase`.
5. Add history screens using `GET /api/cases` and `GET /api/cases/:id`.
