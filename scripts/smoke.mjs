import fs from 'node:fs';
import {createHmac,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const envPath=new URL('../.env',import.meta.url);
const env=fs.existsSync(envPath)?Object.fromEntries(fs.readFileSync(envPath,'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)])):{};
const base=process.env.BASE_URL||'http://localhost:8080';
async function request(method,url,body,token,status=200,key){const response=await fetch(base+'/api/v1'+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const text=await response.text();assert.equal(response.status,status,method+' '+url+': '+text);return text?JSON.parse(text):null;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function eventually(read,predicate,label){for(let i=0;i<80;i++){const value=await read();if(predicate(value))return value;await sleep(500);}throw new Error('Timed out: '+label);}
const suffix=Date.now().toString(36),password='DemoPassword123!';
const admin=await request('POST','/auth/login',{email:process.env.ADMIN_EMAIL||env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD||env.ADMIN_PASSWORD});
const a=admin.accessToken;
const email='buyer-'+suffix+'@example.test';
await request('POST','/auth/register',{email,password,fullName:'Demo Buyer'},null,201);
await request('POST','/auth/register',{email:email.toUpperCase(),password,fullName:'Duplicate'},null,409);
const customer=await request('POST','/auth/login',{email,password});const token=customer.accessToken;
const otherEmail='other-'+suffix+'@example.test';await request('POST','/auth/register',{email:otherEmail,password,fullName:'Other'},null,201);const other=(await request('POST','/auth/login',{email:otherEmail,password})).accessToken;
const category=await request('POST','/categories',{name:'Demo phones',slug:'demo-'+suffix,active:true},a,201);
const sku='PHONE-'+suffix;
const product={name:'Demo Phone',slug:'phone-'+suffix,description:'Smoke test product',categoryId:category.id,brand:'ShopZone',images:[],attributes:{},variants:[{sku,price:20000000,attributes:{color:'Black'},active:true}]};
await request('POST','/products',product,token,403);await request('POST','/products',product,a,201);
await request('PUT','/inventory/'+sku,{onHand:10},a);
await request('POST','/cart/items',{sku,quantity:2},token);const cart=await request('GET','/cart',undefined,token);assert.equal(cart.length,1);
await request('PATCH','/cart/items/'+cart[0].id,{quantity:1},token);await request('DELETE','/cart/items/'+cart[0].id,undefined,token);
const address={recipient:'Demo Buyer',phone:'0900000000',address:'123 Demo Street',city:'Ho Chi Minh City'};
const checkout=(quantity,method='COD')=>({items:[{sku,quantity}],paymentMethod:method,shippingAddress:address});
await request('POST','/orders',{...checkout(1),items:[{sku,quantity:1,price:1}]},token,400,randomUUID());
const key=randomUUID(),cod=await request('POST','/orders',checkout(2),token,202,key);
const retry=await request('POST','/orders',checkout(2),token,202,key);assert.equal(retry.id,cod.id);assert.equal(cod.totalAmount,40000000);
await request('POST','/orders',checkout(3),token,409,key);
await request('GET','/orders/'+cod.id,undefined,other,404);
await eventually(()=>request('GET','/orders/'+cod.id,undefined,token),o=>o.status==='CONFIRMED'&&o.stockCommitted,'COD confirmation');
const codPayment=await request('GET','/payments/'+cod.id,undefined,token);assert.equal(codPayment.status,'PENDING');
await request('POST','/orders/'+cod.id+'/cancel',undefined,token,409);
const tooMany=await request('POST','/orders',checkout(15),token,202,randomUUID());await eventually(()=>request('GET','/orders/'+tooMany.id,undefined,token),o=>o.status==='CANCELLED','insufficient stock');
async function callback(order,status){const transactionId=randomUUID();const body={orderId:order.id,transactionId,amount:order.totalAmount,currency:'VND',status};const raw=[body.orderId,transactionId,body.amount.toFixed(2),'VND',status].join('|');const signature=createHmac('sha256',process.env.PAYMENT_CALLBACK_SECRET||env.PAYMENT_CALLBACK_SECRET).update(raw).digest('hex');const response=await fetch(base+'/api/v1/payments/callback',{method:'POST',headers:{'Content-Type':'application/json','X-Payment-Signature':signature},body:JSON.stringify(body)});assert.equal(response.status,200,await response.text());return {body,signature};}
async function online(quantity){const o=await request('POST','/orders',checkout(quantity,'ONLINE'),token,202,randomUUID());await eventually(()=>request('GET','/orders/'+o.id,undefined,token),v=>v.status==='RESERVED','online reservation');await eventually(async()=>{try{return await request('GET','/payments/'+o.id,undefined,token);}catch{return null;}},v=>v?.status==='PENDING','payment creation');return o;}
const failed=await online(2);
await request('POST','/payments/callback',{orderId:failed.id,transactionId:randomUUID(),amount:failed.totalAmount,currency:'VND',status:'SUCCESS'},null,401);
await callback(failed,'FAILED');await eventually(()=>request('GET','/orders/'+failed.id,undefined,token),o=>o.status==='CANCELLED','payment failure cancellation');await eventually(()=>request('GET','/inventory/'+sku,undefined,token),s=>s.reserved===0&&s.on_hand===8,'compensated stock');
const paid=await online(1);const duplicateCallback=await callback(paid,'SUCCESS');
const duplicateResponse=await fetch(base+'/api/v1/payments/callback',{method:'POST',headers:{'Content-Type':'application/json','X-Payment-Signature':duplicateCallback.signature},body:JSON.stringify(duplicateCallback.body)});assert.equal(duplicateResponse.status,200);
await eventually(()=>request('GET','/orders/'+paid.id,undefined,token),o=>o.status==='PAID'&&o.stockCommitted,'online payment');
const cancelled=await online(2);await request('POST','/orders/'+cancelled.id+'/cancel',undefined,token);await eventually(()=>request('GET','/inventory/'+sku,undefined,token),s=>s.reserved===0&&s.on_hand===7,'cancel compensation');
await callback(cancelled,'SUCCESS');await eventually(()=>request('GET','/payments/'+cancelled.id,undefined,token),p=>p.status==='REFUNDED','late payment refund');
await request('PATCH','/orders/'+cod.id+'/status',{status:'SHIPPING'},a);await request('PATCH','/orders/'+cod.id+'/status',{status:'COMPLETED'},a);await eventually(()=>request('GET','/payments/'+cod.id,undefined,token),p=>p.status==='SUCCESS','COD collection');
const notifications=await eventually(()=>request('GET','/notifications',undefined,token),n=>n.some(x=>x.order_id===cod.id),'notifications');assert.ok(notifications.length>0);
console.log('PASS: register, duplicate email, RBAC, product, cart, trusted prices, checkout idempotency, ownership, COD, insufficient stock, failed payment, signed/duplicate callbacks, cancellation, late refund, shipping, revenue and notifications.');
console.log('Statistics:',await request('GET','/admin/statistics',undefined,a));
