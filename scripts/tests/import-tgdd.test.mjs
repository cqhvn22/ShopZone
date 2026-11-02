import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProducts,importProducts} from '../import-tgdd.mjs';
const url='https://www.thegioididong.com/dtdd/test-phone';
const html=p=>`<script type="application/ld+json">${JSON.stringify(p)}</script>`;
test('parses a VND Product offer and retains source attribution',()=>{
  const rows=parseProducts(html({'@type':'Product',name:'Test phone',brand:{name:'Test'},offers:{price:'12000000',priceCurrency:'VND'},image:'https://cdn.tgdd.vn/test.jpg'}),url);
  assert.equal(rows[0].price,12000000);assert.equal(rows[0].source,url);assert.equal(rows[0].slug,'tgdd-test-phone');
});
test('rejects missing/foreign currency prices and untrusted source URLs',()=>{
  assert.deepEqual(parseProducts(html({'@type':'Product',name:'Test',offers:{price:100,priceCurrency:'USD'}}),url),[]);
  assert.throws(()=>parseProducts(html({'@type':'Product',name:'Test',url:'https://example.com/test',offers:{price:100,priceCurrency:'VND'}}),url));
});
test('handles actual source brand arrays and ImageObject contentUrl',()=>{
  const rows=parseProducts(html({'@type':'Product',name:'Test',brand:{name:['OPPO']},image:{contentUrl:'https://cdn.tgdd.vn/photo.jpg'},offers:{price:100,priceCurrency:'VND'}}),url);
  assert.equal(rows[0].brand,'OPPO');assert.deepEqual(rows[0].images,['https://cdn.tgdd.vn/photo.jpg']);
});
test('import rerun updates matching source without resetting stock',async()=>{
  const products=[];let stocks=0;let onHand=0;
  const api=async(path,method='GET',body)=>{
    if(path==='categories')return [{id:'cat',slug:'dien-thoai'}];
    if(path.startsWith('products?'))return {content:products,totalElements:products.length};
    if(path==='products'){products.push({...body,id:'one'});return products[0];}
    if(path==='products/one'){Object.assign(products[0],body);return products[0];}
    if(path.startsWith('inventory/')){if(method==='PUT'){stocks++;onHand=body.onHand;return {};}if(!stocks){const e=Error();e.status=404;throw e;}return {on_hand:onHand};}
    throw Error(path);
  };
  const rows=[{name:'Test',slug:'tgdd-test-phone',source:url,brand:'Test',images:[],price:100}];
  assert.equal((await importProducts(rows,api,'admin')).created,1);
  onHand=7;rows[0].price=200;
  assert.equal((await importProducts(rows,api,'admin')).updated,1);
  assert.equal(products.length,1);assert.equal(onHand,7);assert.equal(stocks,1);assert.equal(products[0].variants[0].price,200);
});
