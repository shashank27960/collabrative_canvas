
import React, {useState} from 'react';
import axios from 'axios';

export default function Chat(){
  const [messages, setMessages] = useState([
    {from: 'bot', text: 'Ask me about top-selling categories, CO2, or delays.'}
  ]);
  const [input, setInput] = useState('');

  async function send(){
    if(!input) return;
    const userMsg = {from:'user', text: input};
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    try{
      const res = await axios.post('http://localhost:8000/api/chat', {message: input});
      setMessages(prev => [...prev, {from:'bot', text: res.data.answer}]);
    }catch(err){
      setMessages(prev => [...prev, {from:'bot', text: 'Error: could not reach backend.'}]);
    }
  }

  return (
    <div className="chat-card">
      <div className="chat-header">AI Assistant</div>
      <div className="chat-body">
        {messages.map((m,i)=>(
          <div key={i} className={'msg ' + (m.from==='user' ? 'user' : 'bot')}>{m.text}</div>
        ))}
      </div>
      <div className="chat-input">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask something..." />
        <button onClick={send}>Send</button>
      </div>
    </div>
  )
}
