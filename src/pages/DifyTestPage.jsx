const DifyTestPage = () => {
  return (
    <div className="h-full w-full bg-white">
      <iframe
        src="http://localhost:81/chatbot/F2mvd2bnVy4kahev"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '700px'
        }}
        frameBorder="0"
        allow="microphone"
        title="Dify Chatbot"
      />
    </div>
  );
};

export default DifyTestPage;

