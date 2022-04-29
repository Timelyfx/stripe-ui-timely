import { useEffect, useState } from 'react';
import logo from './logo.svg';
import axios from 'axios';
import { loadStripeTerminal } from '@stripe/terminal-js';
import './App.css';

const baseURL = 'https://localhost:7252/stripe';

const StripeTerminal = await loadStripeTerminal();

function fetchConnectionToken() {
  return fetch(`${baseURL}/connection_token`, { method: 'POST' })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      return data.secret;
    });
}

const terminal = StripeTerminal.create({
  onFetchConnectionToken: fetchConnectionToken,
  onUnexpectedReaderDisconnect: () => console.log('unexpected reader disconnect'),
});

const connectReaderHandler = async () => {
  // var config = { simulated: true };
  var config = { simulated: false, location: 'tml_Emcx9whbMIhEha' }; //get from backend

  var discoverResult = await terminal.discoverReaders(config);
  console.log('discovered readers: ', discoverResult);

  if (discoverResult.error) {
    console.log('Failed to discover: ', discoverResult.error);
  } else if (discoverResult.discoveredReaders.length === 0) {
    console.log('No available readers.');
  } else {
    // Just select the first reader here.
    var selectedReader = discoverResult.discoveredReaders[0];

    var readerConnection = await terminal.connectReader(selectedReader);
    
    if (readerConnection.error) {
      console.log('Failed to connect: ', readerConnection.error);
    } else {
      console.log('Connected to reader: ', readerConnection);
    }
  }
  return readerConnection;
};

const connectedReader = await connectReaderHandler();  

function App() {
  const [token, setToken] = useState();
  const [paymentIntent, setPaymentIntent] = useState('');
  const [reader, setReader] = useState();

  const [paymentIntentIdLink, setPaymentIntentIdLink] = useState(undefined);
  // axios
  // .post(`${baseURL}/confirm_payment_intent`, {paymentIntentId: 'pi_3KtWRzLAqxHhSSdo0WF3AzYG'})
  // .then((response) => {

  //   console.log('capture result', response);
  // })
  // .catch((error) => {
  //   console.log('error', error);
  // });

  // console.log(StripeTerminal);
  // console.log(terminal);
  // console.log(connectReaderHandler());
  const handleGetToken = () => {
    axios.post(`${baseURL}/connection_token`).then((response, error) => {
      console.log(response, y);
      setToken(response.data);
    });
  };

  const handleStartPaymentIntent = () => {
    axios.post(`${baseURL}/create_payment_intent`).then((response, error) => {
      console.log('response from create_payment_intent: ', 'response: ', response, 'error: ', error);

      if (!error) {
        setPaymentIntent(response.data);
        setPaymentIntentIdLink(response.data?.id);
      }
    });
  };

  const handleCollectPayment = () => {
    console.log('collect payment');

    terminal.collectPaymentMethod(paymentIntent.clientSecret).then((result) => {
      if (result.error) {
        console.log('error', result.error);
      } else {
        console.log('Collected Confirmation Details: ', result);

        terminal.processPayment(result.paymentIntent)
        .then((result) => {
          console.log('Process result', result);
          axios
            .post(`${baseURL}/confirm_payment_intent`, { paymentIntentId: result.paymentIntent.id })
            .then((response) => {
              console.log('capture result', response);
              alert('Captured successfully');
              window.open(`https://dashboard.stripe.com/test/payments/${paymentIntentIdLink}`);
            })
            .catch((error) => {
              console.log('error fetching', error);
            });
        })
        .catch(error => {
          console.log('error processing payment,  error');
        });
      }
    });
  };

  // useEffect(() => {
  //   setReader(connectedReader);
  // }, [connectedReader]);

  return (
    <>
      <div className='App'>
        <div style={{ display: 'none' }}>
          <h1>Get Token (not required)</h1>
          <button onClick={handleGetToken}>Get Token</button>
          <p>{JSON.stringify(token)}</p>
        </div>

        <div>
          Reader:
          <span> {connectedReader?.reader?.label}</span>
          <a style={{ color: 'green', fontStyle: 'italic', fontWeight: 800 }}> {connectedReader?.reader?.status} </a>
        </div>

        {console.log('connectedReader', connectedReader)}
        {/* <p>{JSON.stringify(connectedReader.reader)}</p> */}

        <h1>Start a Payment Intent</h1>
        <button onClick={handleStartPaymentIntent}> Create Payment Intent </button>

        <h1>Collect Payment</h1>
        <label>Payment Intent:</label>
        <input type='text' onChange={(e) => setPaymentIntent(e.target.value)} value={paymentIntent.clientSecret} />
        <button onClick={handleCollectPayment}>Collect</button>
      </div>

      <div>
        {paymentIntentIdLink && (
          <a href={`https://dashboard.stripe.com/test/payments/${paymentIntentIdLink}`} target='_blank'>
            Stripe link
          </a>
        )}
      </div>
    </>
  );
}

export default App;
