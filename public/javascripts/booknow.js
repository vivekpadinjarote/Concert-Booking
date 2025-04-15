document.getElementById('ticketsBooked').addEventListener('change',function(){
    const tickets = document.getElementById('ticketsBooked').value;
    const ticketPrice = document.getElementById('price').value;

    const totalAmount = tickets*ticketPrice;

    console.log(typeof(ticketPrice),typeof(tickets),typeof(totalAmount))

    document.getElementById('totalAmount').value =Number(totalAmount) 
})
