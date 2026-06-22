import{j as r,a as ye}from"./index-C6sMpg4w.js";import{b as N,d as F,n as we,F as Oe,o as Ne,S as Re,p as Ie,Z as _e}from"./vendor-ui-Di3tVV3c.js";import{L as Se,F as ve,_ as Te,a as Ce,C as Ae,r as Q,b as Pe,d as ke,e as De}from"./vendor-firebase-BuebVkaZ.js";import"./vendor-react-DZNmOxdu.js";var Z="@firebase/ai",B="2.13.1";/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const v="AI",ee="us-central1",Le="firebasevertexai.googleapis.com",D="v1beta",te=B,Me="gl-js",je="hybrid",ze=180*1e3,Fe="gemini-2.5-flash-lite";/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class p extends ve{constructor(e,n,s){const a=v,i=`${a}/${e}`,o=`${a}: ${n} (${i})`;super(e,o),this.code=e,this.customErrorData=s,Error.captureStackTrace&&Error.captureStackTrace(this,p),Object.setPrototypeOf(this,p.prototype),this.toString=()=>o}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ne=["user","model","function","system"],le={HARM_SEVERITY_UNSUPPORTED:"HARM_SEVERITY_UNSUPPORTED"},E={SAFETY:"SAFETY",RECITATION:"RECITATION",BLOCKLIST:"BLOCKLIST",PROHIBITED_CONTENT:"PROHIBITED_CONTENT",SPII:"SPII",MALFORMED_FUNCTION_CALL:"MALFORMED_FUNCTION_CALL",IMAGE_SAFETY:"IMAGE_SAFETY",IMAGE_PROHIBITED_CONTENT:"IMAGE_PROHIBITED_CONTENT",IMAGE_OTHER:"IMAGE_OTHER",NO_IMAGE:"NO_IMAGE",IMAGE_RECITATION:"IMAGE_RECITATION",LANGUAGE:"LANGUAGE",UNEXPECTED_TOOL_CALL:"UNEXPECTED_TOOL_CALL",TOO_MANY_TOOL_CALLS:"TOO_MANY_TOOL_CALLS",MISSING_THOUGHT_SIGNATURE:"MISSING_THOUGHT_SIGNATURE",MALFORMED_RESPONSE:"MALFORMED_RESPONSE"},O={PREFER_ON_DEVICE:"prefer_on_device",ONLY_ON_DEVICE:"only_on_device",ONLY_IN_CLOUD:"only_in_cloud",PREFER_IN_CLOUD:"prefer_in_cloud"},_={ON_DEVICE:"on_device",IN_CLOUD:"in_cloud"};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const d={ERROR:"error",REQUEST_ERROR:"request-error",RESPONSE_ERROR:"response-error",FETCH_ERROR:"fetch-error",SESSION_CLOSED:"session-closed",INVALID_CONTENT:"invalid-content",API_NOT_ENABLED:"api-not-enabled",INVALID_SCHEMA:"invalid-schema",NO_API_KEY:"no-api-key",NO_APP_ID:"no-app-id",NO_MODEL:"no-model",NO_PROJECT_ID:"no-project-id",PARSE_FAILED:"parse-failed",UNSUPPORTED:"unsupported"};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const I={VERTEX_AI:"VERTEX_AI",GOOGLE_AI:"GOOGLE_AI"};/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class de{constructor(e){this.backendType=e}}class H extends de{constructor(){super(I.GOOGLE_AI)}_getModelPath(e,n){return`/${D}/projects/${e}/${n}`}_getTemplatePath(e,n){return`/${D}/projects/${e}/templates/${n}`}}class q extends de{constructor(e=ee){super(I.VERTEX_AI),e?this.location=e:this.location=ee}_getModelPath(e,n){return`/${D}/projects/${e}/locations/${this.location}/${n}`}_getTemplatePath(e,n){return`/${D}/projects/${e}/locations/${this.location}/templates/${n}`}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ge(t){if(t instanceof H)return`${v}/googleai`;if(t instanceof q)return`${v}/vertexai/${t.location}`;throw new p(d.ERROR,`Invalid backend: ${JSON.stringify(t.backendType)}`)}function Ue(t){const e=t.split("/");if(e[0]!==v)throw new p(d.ERROR,`Invalid instance identifier, unknown prefix '${e[0]}'`);switch(e[1]){case"vertexai":const s=e[2];if(!s)throw new p(d.ERROR,`Invalid instance identifier, unknown location '${t}'`);return new q(s);case"googleai":return new H;default:throw new p(d.ERROR,`Invalid instance identifier string: '${t}'`)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const g=new Se("@firebase/vertexai");var R;(function(t){t.UNAVAILABLE="unavailable",t.DOWNLOADABLE="downloadable",t.DOWNLOADING="downloading",t.AVAILABLE="available"})(R||(R={}));/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ue={type:"text",languages:["en"]},G=[ue,{type:"image"}],U=[ue];class w{constructor(e,n,s){this.languageModelProvider=e,this.mode=n,this.downloadPromise=null,this.onDeviceParams={createOptions:{expectedInputs:G,expectedOutputs:U}},s&&(this.onDeviceParams=s,this.onDeviceParams.createOptions?(this.onDeviceParams.createOptions.expectedInputs||(this.onDeviceParams.createOptions.expectedInputs=G),this.onDeviceParams.createOptions.expectedOutputs||(this.onDeviceParams.createOptions.expectedOutputs=U)):this.onDeviceParams.createOptions={expectedInputs:G,expectedOutputs:U})}async isAvailable(e){var s;if(!this.mode)return g.debug("On-device inference unavailable because mode is undefined."),!1;if(this.mode===O.ONLY_IN_CLOUD)return g.debug('On-device inference unavailable because mode is "only_in_cloud".'),!1;const n=await((s=this.languageModelProvider)==null?void 0:s.availability(this.onDeviceParams.createOptions));if(this.mode===O.ONLY_ON_DEVICE){if(n===R.UNAVAILABLE)throw new p(d.API_NOT_ENABLED,"Local LanguageModel API not available in this environment.");if(n===R.DOWNLOADABLE||n===R.DOWNLOADING){g.debug("Waiting for download of LanguageModel to complete.");try{await this.downloadPromise}catch(a){throw new p(d.ERROR,a.message)}return!0}return!0}return n!==R.AVAILABLE?(g.debug(`On-device inference unavailable because availability is "${n}".`),!1):w.isOnDeviceRequest(e)?!0:(g.debug("On-device inference unavailable because request is incompatible."),!1)}async generateContent(e){const n=await this.createSession(),s=await Promise.all(e.contents.map(w.toLanguageModelMessage)),a=await n.prompt(s,this.onDeviceParams.promptOptions);return w.toResponse(a)}async generateContentStream(e){const n=await this.createSession(),s=await Promise.all(e.contents.map(w.toLanguageModelMessage)),a=n.promptStreaming(s,this.onDeviceParams.promptOptions);return w.toStreamResponse(a)}async countTokens(e){throw new p(d.REQUEST_ERROR,"Count Tokens is not yet available for on-device model.")}static isOnDeviceRequest(e){if(e.contents.length===0)return g.debug("Empty prompt rejected for on-device inference."),!1;for(const n of e.contents){if(n.role==="function")return g.debug('"Function" role rejected for on-device inference.'),!1;for(const s of n.parts)if(s.inlineData&&w.SUPPORTED_MIME_TYPES.indexOf(s.inlineData.mimeType)===-1)return g.debug(`Unsupported mime type "${s.inlineData.mimeType}" rejected for on-device inference.`),!1}return!0}async downloadIfAvailable(e){var s;const n=await((s=this.languageModelProvider)==null?void 0:s.availability(this.onDeviceParams.createOptions));return(n===R.DOWNLOADABLE||n===R.DOWNLOADING)&&this.download(e),n}download(e){var s;if(this.downloadPromise)return;const n={...this.onDeviceParams.createOptions};n&&!n.monitor&&e&&(n.monitor=a=>{a.addEventListener("downloadprogress",i=>{e(i.loaded)})}),this.downloadPromise=(s=this.languageModelProvider)==null?void 0:s.create(n).finally(()=>{this.downloadPromise=null})}static async toLanguageModelMessage(e){const n=await Promise.all(e.parts.map(w.toLanguageModelMessageContent));return{role:w.toLanguageModelMessageRole(e.role),content:n}}static async toLanguageModelMessageContent(e){if(e.text)return{type:"text",value:e.text};if(e.inlineData){const s=await(await fetch(`data:${e.inlineData.mimeType};base64,${e.inlineData.data}`)).blob();return{type:"image",value:await createImageBitmap(s)}}throw new p(d.REQUEST_ERROR,"Processing of this Part type is not currently supported.")}static toLanguageModelMessageRole(e){return e==="model"?"assistant":"user"}async createSession(){if(!this.languageModelProvider)throw new p(d.UNSUPPORTED,"Chrome AI requested for unsupported browser version.");const e=await this.languageModelProvider.create(this.onDeviceParams.createOptions);return this.oldSession&&this.oldSession.destroy(),this.oldSession=e,e}static toResponse(e){return{json:async()=>({candidates:[{content:{parts:[{text:e}]}}]})}}static toStreamResponse(e){const n=new TextEncoder;return{body:e.pipeThrough(new TransformStream({transform(s,a){const i=JSON.stringify({candidates:[{content:{role:"model",parts:[{text:s}]}}]});a.enqueue(n.encode(`data: ${i}

`))}}))}}}w.SUPPORTED_MIME_TYPES=["image/jpeg","image/png"];function $e(t,e,n){if(typeof e<"u"&&t)return new w(e.LanguageModel,t,n)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ve{constructor(e,n,s,a,i){this.app=e,this.backend=n,this.chromeAdapterFactory=i;const o=a==null?void 0:a.getImmediate({optional:!0}),c=s==null?void 0:s.getImmediate({optional:!0});this.auth=c||null,this.appCheck=o||null,n instanceof q?this.location=n.location:this.location=""}_delete(){return Promise.resolve()}set options(e){this._options=e}get options(){return this._options}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Be(t,{instanceIdentifier:e}){if(!e)throw new p(d.ERROR,"AIService instance identifier is undefined.");const n=Ue(e),s=t.getProvider("app").getImmediate(),a=t.getProvider("auth-internal"),i=t.getProvider("app-check-internal");return new Ve(s,n,a,i,$e)}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function He(t){var n,s,a,i,o,c,l;if((s=(n=t.app)==null?void 0:n.options)!=null&&s.apiKey)if((i=(a=t.app)==null?void 0:a.options)!=null&&i.projectId){if(!((c=(o=t.app)==null?void 0:o.options)!=null&&c.appId))throw new p(d.NO_APP_ID,'The "appId" field is empty in the local Firebase config. Firebase AI requires this field to contain a valid app ID.')}else throw new p(d.NO_PROJECT_ID,'The "projectId" field is empty in the local Firebase config. Firebase AI requires this field to contain a valid project ID.');else throw new p(d.NO_API_KEY,'The "apiKey" field is empty in the local Firebase config. Firebase AI requires this field to contain a valid API key.');const e={apiKey:t.app.options.apiKey,project:t.app.options.projectId,appId:t.app.options.appId,automaticDataCollectionEnabled:t.app.automaticDataCollectionEnabled,location:t.location,backend:t.backend};if(Te(t.app)&&t.app.settings.appCheckToken){const u=t.app.settings.appCheckToken;e.getAppCheckToken=()=>Promise.resolve({token:u})}else t.appCheck&&((l=t.options)!=null&&l.useLimitedUseAppCheckTokens?e.getAppCheckToken=()=>t.appCheck.getLimitedUseToken():e.getAppCheckToken=()=>t.appCheck.getToken());return t.auth&&(e.getAuthToken=()=>t.auth.getToken()),e}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class P{constructor(e,n){this._apiSettings=He(e),this.model=P.normalizeModelName(n,this._apiSettings.backend.backendType)}static normalizeModelName(e,n){return n===I.GOOGLE_AI?P.normalizeGoogleAIModelName(e):P.normalizeVertexAIModelName(e)}static normalizeGoogleAIModelName(e){return`models/${e}`}static normalizeVertexAIModelName(e){let n;return e.includes("/")?e.startsWith("models/")?n=`publishers/google/${e}`:n=e:n=`publishers/google/models/${e}`,n}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qe="Timeout has expired.",$="AbortError";class Ye{constructor(e){this.params=e}toString(){const e=new URL(this.baseUrl);return e.pathname=this.pathname,e.search=this.queryParams.toString(),e.toString()}get pathname(){return this.params.templateId?`${this.params.apiSettings.backend._getTemplatePath(this.params.apiSettings.project,this.params.templateId)}:${this.params.task}`:`${this.params.apiSettings.backend._getModelPath(this.params.apiSettings.project,this.params.model)}:${this.params.task}`}get baseUrl(){var e;return((e=this.params.singleRequestOptions)==null?void 0:e.baseUrl)??`https://${Le}`}get queryParams(){const e=new URLSearchParams;return this.params.stream&&e.set("alt","sse"),e}}function Ke(t){const e=[];return e.push(`${Me}/${te}`),e.push(`fire/${te}`),(t.params.apiSettings.inferenceMode===O.PREFER_ON_DEVICE||t.params.apiSettings.inferenceMode===O.PREFER_IN_CLOUD)&&e.push(je),e.join(" ")}async function Je(t){const e=new Headers;if(e.append("Content-Type","application/json"),e.append("x-goog-api-client",Ke(t)),e.append("x-goog-api-key",t.params.apiSettings.apiKey),t.params.apiSettings.automaticDataCollectionEnabled&&e.append("X-Firebase-Appid",t.params.apiSettings.appId),t.params.apiSettings.getAppCheckToken){const n=await t.params.apiSettings.getAppCheckToken();n&&(e.append("X-Firebase-AppCheck",n.token),n.error&&g.warn(`Unable to obtain a valid App Check token: ${n.error.message}`))}if(t.params.apiSettings.getAuthToken){const n=await t.params.apiSettings.getAuthToken();n&&e.append("Authorization",`Firebase ${n.accessToken}`)}return e}async function Y(t,e){var u,m;const n=new Ye(t);let s;const a=(u=t.singleRequestOptions)==null?void 0:u.signal,i=((m=t.singleRequestOptions)==null?void 0:m.timeout)!=null&&t.singleRequestOptions.timeout>=0?t.singleRequestOptions.timeout:ze,o=new AbortController,c=setTimeout(()=>{o.abort(new DOMException(qe,$)),g.debug(`Aborting request to ${n} due to timeout (${i}ms)`)},i),l=AbortSignal.any(a?[a,o.signal]:[o.signal]);if(a&&a.aborted)throw clearTimeout(c),new DOMException(a.reason??"Aborted externally before fetch",$);try{const h={method:"POST",headers:await Je(n),signal:l,body:e};if(s=await fetch(n.toString(),h),!s.ok){let x="",f;try{const b=await s.json();x=b.error.message,b.error.details&&(x+=` ${JSON.stringify(b.error.details)}`,f=b.error.details)}catch{}throw s.status===403&&f&&f.some(b=>b.reason==="SERVICE_DISABLED")&&f.some(b=>{var T,y;return(y=(T=b.links)==null?void 0:T[0])==null?void 0:y.description.includes("Google developers console API activation")})?new p(d.API_NOT_ENABLED,`The Firebase AI SDK requires the Firebase AI API ('firebasevertexai.googleapis.com') to be enabled in your Firebase project. Enable this API by visiting the Firebase Console at https://console.firebase.google.com/project/${n.params.apiSettings.project}/ailogic/ and clicking "Get started". If you enabled this API recently, wait a few minutes for the action to propagate to our systems and then retry.`,{status:s.status,statusText:s.statusText,errorDetails:f}):new p(d.FETCH_ERROR,`Error fetching from ${n}: [${s.status} ${s.statusText}] ${x}`,{status:s.status,statusText:s.statusText,errorDetails:f})}}catch(h){let x=h;throw h.code!==d.FETCH_ERROR&&h.code!==d.API_NOT_ENABLED&&h instanceof Error&&h.name!==$&&(x=new p(d.ERROR,`Error fetching from ${n.toString()}: ${h.message}`),x.stack=h.stack),x}finally{clearTimeout(c)}return s}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function k(t){if(t.candidates&&t.candidates.length>0){if(t.candidates.length>1&&g.warn(`This response had ${t.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),he(t.candidates[0]))throw new p(d.RESPONSE_ERROR,`Response error: ${S(t)}. Response body stored in error.response`,{response:t});return!0}else return!1}function L(t,e=_.IN_CLOUD){t.candidates&&!t.candidates[0].hasOwnProperty("index")&&(t.candidates[0].index=0);const n=We(t);return n.inferenceSource=e,n}function We(t){return t.text=()=>{if(k(t))return se(t,e=>!e.thought);if(t.promptFeedback)throw new p(d.RESPONSE_ERROR,`Text not available. ${S(t)}`,{response:t});return""},t.thoughtSummary=()=>{if(k(t)){const e=se(t,n=>!!n.thought);return e===""?void 0:e}else if(t.promptFeedback)throw new p(d.RESPONSE_ERROR,`Thought summary not available. ${S(t)}`,{response:t})},t.inlineDataParts=()=>{if(k(t))return Xe(t);if(t.promptFeedback)throw new p(d.RESPONSE_ERROR,`Data not available. ${S(t)}`,{response:t})},t.functionCalls=()=>{if(k(t))return pe(t);if(t.promptFeedback)throw new p(d.RESPONSE_ERROR,`Function call not available. ${S(t)}`,{response:t})},t}function se(t,e){var s,a,i,o;const n=[];if((a=(s=t.candidates)==null?void 0:s[0].content)!=null&&a.parts)for(const c of(o=(i=t.candidates)==null?void 0:i[0].content)==null?void 0:o.parts)c.text&&e(c)&&n.push(c.text);return n.length>0?n.join(""):""}function pe(t){var n,s,a,i;if(!t)return;const e=[];if((s=(n=t.candidates)==null?void 0:n[0].content)!=null&&s.parts)for(const o of(i=(a=t.candidates)==null?void 0:a[0].content)==null?void 0:i.parts)o.functionCall&&e.push(o.functionCall);if(e.length>0)return e}function Xe(t){var n,s,a,i;const e=[];if((s=(n=t.candidates)==null?void 0:n[0].content)!=null&&s.parts)for(const o of(i=(a=t.candidates)==null?void 0:a[0].content)==null?void 0:i.parts)o.inlineData&&e.push(o);if(e.length>0)return e}const Qe=[E.RECITATION,E.SAFETY,E.BLOCKLIST,E.PROHIBITED_CONTENT,E.SPII,E.MALFORMED_FUNCTION_CALL,E.IMAGE_SAFETY,E.IMAGE_PROHIBITED_CONTENT,E.IMAGE_OTHER,E.NO_IMAGE,E.IMAGE_RECITATION,E.LANGUAGE,E.UNEXPECTED_TOOL_CALL,E.TOO_MANY_TOOL_CALLS,E.MISSING_THOUGHT_SIGNATURE,E.MALFORMED_RESPONSE];function he(t){return!!t.finishReason&&Qe.some(e=>e===t.finishReason)}function S(t){var n,s,a;let e="";if((!t.candidates||t.candidates.length===0)&&t.promptFeedback)e+="Response was blocked",(n=t.promptFeedback)!=null&&n.blockReason&&(e+=` due to ${t.promptFeedback.blockReason}`),(s=t.promptFeedback)!=null&&s.blockReasonMessage&&(e+=`: ${t.promptFeedback.blockReasonMessage}`);else if((a=t.candidates)!=null&&a[0]){const i=t.candidates[0];he(i)&&(e+=`Candidate was blocked due to ${i.finishReason}`,i.finishMessage&&(e+=`: ${i.finishMessage}`))}return e}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fe(t){var e,n;if((e=t.safetySettings)==null||e.forEach(s=>{if(s.method)throw new p(d.UNSUPPORTED,"SafetySetting.method is not supported in the the Gemini Developer API. Please remove this property.")}),(n=t.generationConfig)!=null&&n.topK){const s=Math.round(t.generationConfig.topK);s!==t.generationConfig.topK&&(g.warn("topK in GenerationConfig has been rounded to the nearest integer to match the format for requests to the Gemini Developer API."),t.generationConfig.topK=s)}return t}function K(t){return{candidates:t.candidates?et(t.candidates):void 0,prompt:t.promptFeedback?tt(t.promptFeedback):void 0,usageMetadata:t.usageMetadata}}function Ze(t,e){return{generateContentRequest:{model:e,...t}}}function et(t){const e=[];let n;return e&&t.forEach(s=>{var o,c;let a;if(s.citationMetadata&&(a={citations:s.citationMetadata.citationSources}),s.safetyRatings&&(n=s.safetyRatings.map(l=>({...l,severity:l.severity??le.HARM_SEVERITY_UNSUPPORTED,probabilityScore:l.probabilityScore??0,severityScore:l.severityScore??0}))),(c=(o=s.content)==null?void 0:o.parts)!=null&&c.some(l=>l==null?void 0:l.videoMetadata))throw new p(d.UNSUPPORTED,"Part.videoMetadata is not supported in the Gemini Developer API. Please remove this property.");const i={index:s.index,content:s.content,finishReason:s.finishReason,finishMessage:s.finishMessage,safetyRatings:n,citationMetadata:a,groundingMetadata:s.groundingMetadata,urlContextMetadata:s.urlContextMetadata};e.push(i)}),e}function tt(t){const e=[];return t.safetyRatings.forEach(s=>{e.push({category:s.category,probability:s.probability,severity:s.severity??le.HARM_SEVERITY_UNSUPPORTED,probabilityScore:s.probabilityScore??0,severityScore:s.severityScore??0,blocked:s.blocked})}),{blockReason:t.blockReason,safetyRatings:e,blockReasonMessage:t.blockReasonMessage}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ae=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;async function nt(t,e,n){const s=t.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0})),a=ot(s),[i,o]=a.tee(),{response:c,firstValue:l}=await st(o,e,n);return{stream:it(i,e,n),response:c,firstValue:l}}async function st(t,e,n){const[s,a]=t.tee(),i=s.getReader(),{value:o}=await i.read();return{firstValue:o,response:at(a,e,n)}}async function at(t,e,n){const s=[],a=t.getReader();for(;;){const{done:i,value:o}=await a.read();if(i){let c=rt(s);return e.backend.backendType===I.GOOGLE_AI&&(c=K(c)),L(c,n)}s.push(o)}}async function*it(t,e,n){var a,i;const s=t.getReader();for(;;){const{value:o,done:c}=await s.read();if(c)break;let l;e.backend.backendType===I.GOOGLE_AI?l=L(K(o),n):l=L(o,n);const u=(a=l.candidates)==null?void 0:a[0];!((i=u==null?void 0:u.content)!=null&&i.parts)&&!(u!=null&&u.finishReason)&&!(u!=null&&u.citationMetadata)&&!(u!=null&&u.urlContextMetadata)||(yield l)}}function ot(t){const e=t.getReader();return new ReadableStream({start(s){let a="";return i();function i(){return e.read().then(({value:o,done:c})=>{if(c){if(a.trim()){s.error(new p(d.PARSE_FAILED,"Failed to parse stream"));return}s.close();return}a+=o;let l=a.match(ae),u;for(;l;){try{u=JSON.parse(l[1])}catch{s.error(new p(d.PARSE_FAILED,`Error parsing JSON response: "${l[1]}`));return}s.enqueue(u),a=a.substring(l[0].length),l=a.match(ae)}return i()})}}})}function rt(t){const e=t[t.length-1],n={promptFeedback:e==null?void 0:e.promptFeedback};for(const s of t)if(s.candidates)for(const a of s.candidates){const i=a.index||0;n.candidates||(n.candidates=[]),n.candidates[i]||(n.candidates[i]={index:a.index}),n.candidates[i].citationMetadata=a.citationMetadata,n.candidates[i].finishReason=a.finishReason,n.candidates[i].finishMessage=a.finishMessage,n.candidates[i].safetyRatings=a.safetyRatings,n.candidates[i].groundingMetadata=a.groundingMetadata;const o=a.urlContextMetadata;if(typeof o=="object"&&o!==null&&Object.keys(o).length>0&&(n.candidates[i].urlContextMetadata=o),a.content){if(!a.content.parts)continue;n.candidates[i].content||(n.candidates[i].content={role:a.content.role||"user",parts:[]});for(const c of a.content.parts){const l={...c};c.text!==""&&Object.keys(l).length>0&&n.candidates[i].content.parts.push(l)}}}return n}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ct=[d.FETCH_ERROR,d.ERROR,d.API_NOT_ENABLED];async function me(t,e,n,s){if(!e)return{response:await s(),inferenceSource:_.IN_CLOUD};switch(e.mode){case O.ONLY_ON_DEVICE:if(await e.isAvailable(t))return{response:await n(),inferenceSource:_.ON_DEVICE};throw new p(d.UNSUPPORTED,"Inference mode is ONLY_ON_DEVICE, but an on-device model is not available.");case O.ONLY_IN_CLOUD:return{response:await s(),inferenceSource:_.IN_CLOUD};case O.PREFER_IN_CLOUD:try{return{response:await s(),inferenceSource:_.IN_CLOUD}}catch(a){if(a instanceof p&&ct.includes(a.code)&&await e.isAvailable(t))return{response:await n(),inferenceSource:_.ON_DEVICE};throw a}case O.PREFER_ON_DEVICE:return await e.isAvailable(t)?{response:await n(),inferenceSource:_.ON_DEVICE}:{response:await s(),inferenceSource:_.IN_CLOUD};default:throw new p(d.ERROR,`Unexpected infererence mode: ${e.mode}`)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function lt(t,e,n,s){return t.backend.backendType===I.GOOGLE_AI&&(n=fe(n)),Y({task:"streamGenerateContent",model:e,apiSettings:t,stream:!0,singleRequestOptions:s},JSON.stringify(n))}async function ge(t,e,n,s,a){const i=await me(n,s,()=>s.generateContentStream(n),()=>lt(t,e,n,a));return nt(i.response,t,i.inferenceSource)}async function dt(t,e,n,s){return t.backend.backendType===I.GOOGLE_AI&&(n=fe(n)),Y({model:e,task:"generateContent",apiSettings:t,stream:!1,singleRequestOptions:s},JSON.stringify(n))}async function be(t,e,n,s,a){const i=await me(n,s,()=>s.generateContent(n),()=>dt(t,e,n,a)),o=await ut(i.response,t);return{response:L(o,i.inferenceSource)}}async function ut(t,e){const n=await t.json();return e.backend.backendType===I.GOOGLE_AI?K(n):n}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function J(t){if(t!=null){if(typeof t=="string")return{role:"system",parts:[{text:t}]};if(t.text)return{role:"system",parts:[t]};if(t.parts)return t.role?t:{role:"system",parts:t.parts}}}function A(t){let e=[];if(typeof t=="string")e=[{text:t}];else for(const n of t)typeof n=="string"?e.push({text:n}):e.push(n);return pt(e)}function pt(t){const e={role:"user",parts:[]},n={role:"function",parts:[]};let s=!1,a=!1;for(const i of t)"functionResponse"in i?(n.parts.push(i),a=!0):(e.parts.push(i),s=!0);if(s&&a)throw new p(d.INVALID_CONTENT,"Within a single message, FunctionResponse cannot be mixed with other type of Part in the request for sending chat message.");if(!s&&!a)throw new p(d.INVALID_CONTENT,"No Content is provided for sending chat message.");return s?e:n}function V(t){let e;return t.contents?e=t:e={contents:[A(t)]},t.systemInstruction&&(e.systemInstruction=J(t.systemInstruction)),e}/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ie="SILENT_ERROR",oe=10;class ht{constructor(e,n,s){this.params=n,this.requestOptions=s,this._history=[],this._sendPromise=Promise.resolve(),this._apiSettings=e}async getHistory(){return await this._sendPromise,this._history}async _sendMessage(e,n){let s={};await this._sendPromise;const a=[];return this._sendPromise=this._sendPromise.then(async()=>{var l,u,m;let i,o=0;const c=((l=this.requestOptions)==null?void 0:l.maxSequentialFunctionCalls)??oe;do{let h;if(i){o++;const b=await this._callFunctionsAsNeeded(i);h=A(b)}else h=A(e);const x=this._formatRequest(h,[...a]);a.push(h);const f=await this._callGenerateContent(x,n);if(f)if(s=f,i=this._getCallableFunctionCalls(f.response),f.response.candidates&&f.response.candidates.length>0){const b={parts:((u=f.response.candidates)==null?void 0:u[0].content.parts)||[],role:((m=f.response.candidates)==null?void 0:m[0].content.role)||"model"};a.push(b)}else{const b=S(f.response);b&&g.warn(`sendMessage() was unsuccessful. ${b}. Inspect response object for details.`)}else i=void 0}while(i&&o<c);i&&o>=c&&g.warn(`Automatic function calling exceeded the limit of ${c} function calls. Returning last model response.`)}),await this._sendPromise,this._history=this._history.concat(a),s}async _sendMessageStream(e,n){await this._sendPromise;const s=[],i=(async()=>{var m;let o,c=0;const l=((m=this.requestOptions)==null?void 0:m.maxSequentialFunctionCalls)??oe;let u;do{let h;if(o){c++;const f=await this._callFunctionsAsNeeded(o);h=A(f)}else h=A(e);const x=this._formatRequest(h,[...s]);if(s.push(h),u=await this._callGenerateContentStream(x,n),o=this._getCallableFunctionCalls(u.firstValue),o&&u.firstValue&&u.firstValue.candidates&&u.firstValue.candidates.length>0){const f={...u.firstValue.candidates[0].content};f.role||(f.role="model"),s.push(f)}}while(o&&c<l);return o&&c>=l&&g.warn(`Automatic function calling exceeded the limit of ${l} function calls. Returning last model response.`),{stream:u.stream,response:u.response}})();return this._sendPromise=this._sendPromise.then(async()=>i).catch(o=>{throw new Error(ie)}).then(o=>o.response).then(o=>{if(o.candidates&&o.candidates.length>0){this._history=this._history.concat(s);const c={...o.candidates[0].content};c.role||(c.role="model"),this._history.push(c)}else{const c=S(o);c&&g.warn(`sendMessageStream() was unsuccessful. ${c}. Inspect response object for details.`)}}).catch(o=>{o.message!==ie&&o.name!=="AbortError"&&g.error(o)}),i}_getCallableFunctionCalls(e){var a,i,o;const n=(i=(a=this.params)==null?void 0:a.tools)==null?void 0:i.find(c=>c.functionDeclarations);if(!(n!=null&&n.functionDeclarations))return;const s=pe(e);if(s){for(const c of s)if(!((o=n.functionDeclarations)==null?void 0:o.some(u=>u.name===c.name&&typeof u.functionReference=="function")))return;return s}}async _callFunctionsAsNeeded(e){var i,o;const n=[],s=[],a=(o=(i=this.params)==null?void 0:i.tools)==null?void 0:o.find(c=>c.functionDeclarations);if(a&&a.functionDeclarations){for(const l of e){const u=a.functionDeclarations.find(m=>m.name===l.name);if(u!=null&&u.functionReference){const m=Promise.resolve(u.functionReference(l.args)).catch(h=>{const x=new p(d.ERROR,`Error in user-defined function "${u.name}": ${h.message}`);throw x.stack=h.stack,x});n.push({name:l.name,id:l.id,results:m}),s.push(m)}}await Promise.all(s);const c=[];for(const{name:l,id:u,results:m}of n){const h={name:l,response:await m};u&&(h.id=u),c.push({functionResponse:h})}return c}else throw new p(d.REQUEST_ERROR,'No function declarations were provided in "tools".')}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const re=["text","inlineData","functionCall","functionResponse","thought","thoughtSignature"],ft={user:["text","inlineData"],function:["functionResponse"],model:["text","functionCall","thought","thoughtSignature"],system:["text"]},ce={user:["model"],function:["model"],model:["user","function"],system:[]};function mt(t){let e=null;for(const n of t){const{role:s,parts:a}=n;if(!e&&s!=="user")throw new p(d.INVALID_CONTENT,`First Content should be with role 'user', got ${s}`);if(!ne.includes(s))throw new p(d.INVALID_CONTENT,`Each item should include role field. Got ${s} but valid roles are: ${JSON.stringify(ne)}`);if(!Array.isArray(a))throw new p(d.INVALID_CONTENT,"Content should have 'parts' property with an array of Parts");if(a.length===0)throw new p(d.INVALID_CONTENT,"Each Content should have at least one part");const i={text:0,inlineData:0,functionCall:0,functionResponse:0,thought:0,thoughtSignature:0,executableCode:0,codeExecutionResult:0};for(const c of a)for(const l of re)l in c&&(i[l]+=1);const o=ft[s];for(const c of re)if(!o.includes(c)&&i[c]>0)throw new p(d.INVALID_CONTENT,`Content with role '${s}' can't contain '${c}' part`);if(e&&!ce[s].includes(e.role))throw new p(d.INVALID_CONTENT,`Content with role '${s}' can't follow '${e.role}'. Valid previous roles: ${JSON.stringify(ce)}`);e=n}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gt extends ht{constructor(e,n,s,a,i){var o;super(e,a,i),this.model=n,this.chromeAdapter=s,this.params=a,this.requestOptions=i,a!=null&&a.history&&(mt(a.history),this._history=a.history),((o=this.params)==null?void 0:o.systemInstruction)!=null&&(this.params={...this.params,systemInstruction:J(this.params.systemInstruction)})}_formatRequest(e,n){var s,a,i,o,c;return{safetySettings:(s=this.params)==null?void 0:s.safetySettings,generationConfig:(a=this.params)==null?void 0:a.generationConfig,tools:(i=this.params)==null?void 0:i.tools,toolConfig:(o=this.params)==null?void 0:o.toolConfig,systemInstruction:(c=this.params)==null?void 0:c.systemInstruction,contents:[...this._history,...n,e]}}_callGenerateContent(e,n){return be(this._apiSettings,this.model,e,this.chromeAdapter,{...this.requestOptions,...n})}_callGenerateContentStream(e,n){return ge(this._apiSettings,this.model,e,this.chromeAdapter,{...this.requestOptions,...n})}async sendMessage(e,n){return this._sendMessage(e,n)}async sendMessageStream(e,n){return this._sendMessageStream(e,n)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function bt(t,e,n,s){let a="";if(t.backend.backendType===I.GOOGLE_AI){const o=Ze(n,e);a=JSON.stringify(o)}else a=JSON.stringify(n);return(await Y({model:e,task:"countTokens",apiSettings:t,stream:!1,singleRequestOptions:s},a)).json()}async function xt(t,e,n,s,a){if((s==null?void 0:s.mode)===O.ONLY_ON_DEVICE)throw new p(d.UNSUPPORTED,"countTokens() is not supported for on-device models.");return bt(t,e,n,a)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Et extends P{constructor(e,n,s,a){super(e,n.model),this.chromeAdapter=a,this.generationConfig=n.generationConfig||{},yt(this.generationConfig),this.safetySettings=n.safetySettings||[],this.tools=n.tools,this.toolConfig=n.toolConfig,this.systemInstruction=J(n.systemInstruction),this.requestOptions=s||{}}async initializeDeviceModel(e){if(!this.chromeAdapter||this.chromeAdapter.mode===O.ONLY_IN_CLOUD)return;if(await this.chromeAdapter.downloadIfAvailable(e)===R.UNAVAILABLE){const s=new p(d.API_NOT_ENABLED,"Local LanguageModel API not available in this environment.");if(this.chromeAdapter.mode===O.ONLY_ON_DEVICE)throw s;g.debug(s.message)}await this.chromeAdapter.downloadPromise}async generateContent(e,n){const s=V(e);return be(this._apiSettings,this.model,{generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,...s},this.chromeAdapter,{...this.requestOptions,...n})}async generateContentStream(e,n){const s=V(e),{stream:a,response:i}=await ge(this._apiSettings,this.model,{generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,...s},this.chromeAdapter,{...this.requestOptions,...n});return{stream:a,response:i}}startChat(e){return new gt(this._apiSettings,this.model,this.chromeAdapter,{tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,generationConfig:this.generationConfig,safetySettings:this.safetySettings,...e},this.requestOptions)}async countTokens(e,n){const s=V(e);return xt(this._apiSettings,this.model,s,this.chromeAdapter,{...this.requestOptions,...n})}}function yt(t){var e,n;if(((e=t.thinkingConfig)==null?void 0:e.thinkingBudget)!=null&&((n=t.thinkingConfig)!=null&&n.thinkingLevel))throw new p(d.UNSUPPORTED,"Cannot set both thinkingBudget and thinkingLevel in a config.");if(t.responseSchema!=null&&t.responseJsonSchema!=null)throw new p(d.UNSUPPORTED,"Cannot set both responseSchema and responseJsonSchema in a config.");if((t.responseSchema!=null||t.responseJsonSchema!=null)&&t.responseMimeType!=="application/json")throw new p(d.UNSUPPORTED,'responseMimeType must be set to "application/json" if responseSchema or responseJsonSchema are set.')}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wt(t=De(),e){t=Pe(t);const n=ke(t,v),s=new H,a={useLimitedUseAppCheckTokens:!1},i=Ge(s),o=n.getImmediate({identifier:i});return o.options=a,o}const Ot=["mode","onDeviceParams","inCloudParams"];function Nt(t,e,n){var c;const s=e;let a;if(s.mode){for(const l of Object.keys(e))Ot.includes(l)||g.warn(`When a hybrid inference mode is specified (mode is currently set to ${s.mode}), "${l}" cannot be configured at the top level. Configuration for in-cloud and on-device must be done separately in inCloudParams and onDeviceParams. Configuration values set outside of inCloudParams and onDeviceParams will be ignored.`);a=s.inCloudParams||{model:Fe}}else a=e;if(!a.model)throw new p(d.NO_MODEL,"Must provide a model name. Example: getGenerativeModel({ model: 'my-model-name' })");const i=(c=t.chromeAdapterFactory)==null?void 0:c.call(t,s.mode,typeof window>"u"?void 0:window,s.onDeviceParams),o=new Et(t,a,n,i);return o._apiSettings.inferenceMode=s.mode,o}function Rt(){Ce(new Ae(v,Be,"PUBLIC").setMultipleInstances(!0)),Q(Z,B),Q(Z,B,"esm2020")}Rt();throw new Error("VITE_FIREBASE_API_KEY is not set. Please add it to your .env file.");const It=wt(ye),_t=Nt(It,{model:"gemini-1.5-flash"}),St=({content:t})=>r.jsx("div",{className:"text-xs whitespace-pre-wrap font-mono",children:t});function Pt(){var T;const[t,e]=N.useState("trends"),[n,s]=N.useState(""),[a,i]=N.useState(null),[o,c]=N.useState([]),[l,u]=N.useState(!1),m=N.useRef(null),h=N.useRef(null),x=()=>{i(null),c([]),m.current=_t.startChat({systemInstruction:{parts:[{text:"You are a world-class executive chef and culinary director for an upscale, modern restaurant. Your expertise lies in menu engineering, flavor pairing, and innovative dish creation. Respond to prompts with creativity, precision, and a deep understanding of both classic techniques and current food trends. Provide detailed recipes, costing analysis, or conceptual feedback as requested."}]}})};N.useEffect(()=>{t==="optimizer"&&!m.current&&x()},[t]),N.useEffect(()=>{h.current&&(h.current.scrollTop=h.current.scrollHeight)},[o]);const f=()=>{x()},b=async y=>{if(y.preventDefault(),!n.trim()||l||!m.current)return;u(!0),i(null);const M={role:"user",content:n};c(C=>[...C,M]);const xe=n;s("");try{const C=await m.current.sendMessageStream(xe);let j="";c(z=>[...z,{role:"model",content:j}]);for await(const z of C.stream)j+=z.text(),c(W=>W.map((X,Ee)=>Ee===W.length-1?{...X,content:j}:X))}catch(C){i(C.message||"An error occurred while communicating with the AI.")}finally{u(!1)}};return r.jsxs("div",{className:"p-6 space-y-6 max-w-7xl mx-auto font-mono text-zinc-100 selection:bg-emerald-800",children:[r.jsxs("div",{className:"border-b border-zinc-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4",children:[r.jsxs("div",{children:[r.jsx("h1",{className:"text-xl font-extrabold tracking-wider uppercase",children:"Test Kitchen & Trend Matrix"}),r.jsx("p",{className:"text-[11px] text-zinc-500 uppercase tracking-widest mt-1",children:"Develop new dishes and reform existing profiles with real-time AI assistance"})]}),r.jsxs("div",{className:"flex gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner",children:[r.jsx("button",{onClick:()=>e("trends"),className:`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all border ${t==="trends"?"bg-zinc-900 text-emerald-400 border-zinc-700 shadow-md":"bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent"}`,children:"Hot Trends"}),r.jsxs("button",{onClick:()=>e("optimizer"),className:`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 border ${t==="optimizer"?"bg-zinc-900 text-emerald-400 border-zinc-700 shadow-md":"bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent"}`,children:[r.jsx(F,{className:"w-3.5 h-3.5"})," AI Dish Optimizer"]})]})]}),t==="trends"&&r.jsxs("div",{className:"space-y-6 animate-fadeIn font-mono tracking-tight",children:[r.jsxs("div",{className:"bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-3 shadow-lg",children:[r.jsxs("h3",{className:"text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2",children:[r.jsx(we,{className:"w-4 h-4 text-amber-500"})," Sector Market Summary"]}),r.jsx("p",{className:"text-xs text-zinc-400 leading-relaxed max-w-5xl",children:'The upscale wine bar segment is currently driven by "luxury-lite" experiences, where guests prioritize visually intricate appetizers and high-provenance proteins over traditional heavy entrees. Sustainability and transparency in sourcing, particularly regarding "Heritage" and "Regenerative" labels, have become mandatory for the 2026 luxury consumer.'})]}),r.jsxs("div",{className:"space-y-3",children:[r.jsxs("div",{className:"flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400",children:[r.jsx(Oe,{className:"w-4 h-4 text-orange-500"})," Hot Consumer Vectors"]}),r.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",children:[r.jsxs("div",{className:"bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg",children:[r.jsxs("div",{className:"h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800",children:[r.jsx("span",{className:"absolute inset-0 bg-cover bg-center opacity-60",style:{backgroundImage:"url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80')"}}),r.jsx("span",{className:"relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400",children:"🥩 Protein Component"})]}),r.jsx("div",{className:"p-4 bg-zinc-950",children:r.jsx("h4",{className:"text-xs font-bold uppercase text-zinc-200 tracking-wider",children:"Regenerative Agriculture Proteins"})})]}),r.jsxs("div",{className:"bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg",children:[r.jsxs("div",{className:"h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800",children:[r.jsx("span",{className:"absolute inset-0 bg-cover bg-center opacity-60",style:{backgroundImage:"url('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80')"}}),r.jsx("span",{className:"relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400",children:"🥗 Sourcing Matrix"})]}),r.jsx("div",{className:"p-4 bg-zinc-950",children:r.jsx("h4",{className:"text-xs font-bold uppercase text-zinc-200 tracking-wider",children:"Hyper-localized Heirloom Vegetables"})})]}),r.jsxs("div",{className:"bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg",children:[r.jsxs("div",{className:"h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800",children:[r.jsx("span",{className:"absolute inset-0 bg-cover bg-center opacity-60",style:{backgroundImage:"url('https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80')"}}),r.jsx("span",{className:"relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400",children:"🍯 Kitchen Operations"})]}),r.jsx("div",{className:"p-4 bg-zinc-950",children:r.jsx("h4",{className:"text-xs font-bold uppercase text-zinc-200 tracking-wider",children:"Zero-Waste Fermented Garnishes"})})]}),r.jsxs("div",{className:"bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg",children:[r.jsxs("div",{className:"h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800",children:[r.jsx("span",{className:"absolute inset-0 bg-cover bg-center opacity-60",style:{backgroundImage:"url('https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80')"}}),r.jsx("span",{className:"relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400",children:"🏺 Saucier Station"})]}),r.jsx("div",{className:"p-4 bg-zinc-950",children:r.jsx("h4",{className:"text-xs font-bold uppercase text-zinc-200 tracking-wider",children:"Modernized 19th Century French Sauces"})})]}),r.jsxs("div",{className:"bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors shadow-lg",children:[r.jsxs("div",{className:"h-44 bg-zinc-950 relative flex items-center justify-center text-zinc-700 font-sans text-lg border-b border-zinc-800",children:[r.jsx("span",{className:"absolute inset-0 bg-cover bg-center opacity-60",style:{backgroundImage:"url('https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80')"}}),r.jsx("span",{className:"relative z-10 bg-zinc-950/80 px-3 py-1.5 rounded text-xs font-mono tracking-normal border border-zinc-800 text-zinc-400",children:"🥫 Pantry Imports"})]}),r.jsx("div",{className:"p-4 bg-zinc-950",children:r.jsx("h4",{className:"text-xs font-bold uppercase text-zinc-200 tracking-wider",children:"Tinned Fish & Gourmet Conservas"})})]})]})]})]}),t==="optimizer"&&r.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn font-mono tracking-tight",children:[r.jsxs("div",{className:"lg:col-span-2 space-y-4",children:[r.jsxs("div",{className:"bg-zinc-950 border border-zinc-800 rounded-xl p-5 min-h-[350px] flex flex-col justify-between relative shadow-lg",children:[r.jsxs("div",{className:"flex justify-between items-center border-b border-zinc-900 pb-3",children:[r.jsx("div",{className:"text-xs font-bold text-zinc-400 uppercase tracking-wider",children:"Interactive Formula Engineering Shell"}),r.jsxs("button",{onClick:f,className:"text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors",children:[r.jsx(Ne,{className:"w-3 h-3"})," New Session"]})]}),r.jsx("div",{ref:h,className:"flex-1 p-4 my-4 overflow-y-auto h-96",children:o.length===0&&!l?r.jsx("div",{className:"flex items-center justify-center h-full text-center",children:r.jsx("p",{className:"text-xs text-zinc-600 uppercase max-w-md leading-relaxed tracking-wider",children:"Brainstorm and develop brand-new dishes from scratch. Get AI guidance on trending ingredients, flavor pairings, and precise menu costing adjustments."})}):r.jsxs("div",{className:"space-y-6",children:[o.map((y,M)=>r.jsxs("div",{className:`flex gap-3 ${y.role==="user"?"justify-end":"justify-start"}`,children:[y.role==="model"&&r.jsx("div",{className:"w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0",children:r.jsx(F,{className:"w-3.5 h-3.5"})}),r.jsx("div",{className:`max-w-xl p-3 rounded-xl ${y.role==="user"?"bg-zinc-800 text-zinc-200":"bg-transparent"}`,children:r.jsx(St,{content:y.content})})]},M)),l&&((T=o[o.length-1])==null?void 0:T.role)==="user"&&r.jsxs("div",{className:"flex gap-3 justify-start",children:[r.jsx("div",{className:"w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0",children:r.jsx(F,{className:"w-3.5 h-3.5"})}),r.jsx("div",{className:"max-w-xl p-3 rounded-xl",children:r.jsx("span",{className:"animate-pulse text-zinc-500",children:"..."})})]})]})}),r.jsx("form",{onSubmit:b,className:"space-y-3 pt-3",children:r.jsxs("div",{className:"relative",children:[r.jsx("input",{type:"text",value:n,onChange:y=>s(y.target.value),placeholder:"Describe a dish concept you want to develop, ingredients you want to work with...",className:"w-full bg-zinc-950 border border-zinc-800 p-3.5 pr-12 rounded-xl text-xs focus:outline-none focus:border-zinc-700 text-zinc-200 placeholder:text-zinc-700 font-mono disabled:opacity-50",disabled:l}),r.jsx("button",{type:"submit",disabled:l,className:"absolute right-3 top-3 text-zinc-700 hover:text-emerald-500 transition-colors disabled:opacity-50 disabled:hover:text-zinc-700",children:r.jsx(Re,{className:"w-4 h-4"})})]})})]}),a&&r.jsxs("div",{className:"bg-zinc-950 border border-red-950 rounded-xl p-3 flex justify-between items-center shadow-md animate-slideUp",children:[r.jsxs("div",{className:"flex items-center gap-2.5 text-red-400 text-xs font-bold",children:[r.jsx(Ie,{className:"w-4 h-4 shrink-0 text-red-500"}),r.jsx("span",{className:"uppercase tracking-wider",children:a})]}),r.jsx("button",{onClick:()=>i(null),className:"text-[9px] uppercase font-bold tracking-widest bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-800 transition-colors",children:"Clear Status"})]})]}),r.jsxs("div",{className:"bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-lg",children:[r.jsxs("h3",{className:"text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2 flex items-center gap-2",children:[r.jsx(_e,{className:"w-3.5 h-3.5 text-emerald-500"})," Co-Pilot Engineering Anchors"]}),r.jsxs("div",{className:"space-y-3 text-[11px] text-zinc-500 leading-relaxed uppercase",children:[r.jsxs("div",{className:"p-3 bg-zinc-950 border border-zinc-900 rounded-lg",children:[r.jsx("span",{className:"font-bold text-zinc-400 block mb-1",children:"Target Margin Guardrails"}),"Align ingredients natively against the custom ",r.jsx("span",{className:"text-blue-400",children:"30% target ceiling matrix"})," to maximize plate yields."]}),r.jsxs("div",{className:"p-3 bg-zinc-950 border border-zinc-900 rounded-lg",children:[r.jsx("span",{className:"font-bold text-zinc-400 block mb-1",children:"Dynamic Saucier Assist"}),"Auto-calculate batch reductions and emulsion stability benchmarks during ingredient ingestion passes."]})]})]})]})]})}export{Pt as default};
