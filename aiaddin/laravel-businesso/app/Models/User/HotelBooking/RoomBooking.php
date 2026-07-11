<?php

namespace App\Models\User\HotelBooking;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomBooking extends Model
{
    use HasFactory;

    public $table = 'user_room_bookings';

    protected $guarded = [];

    public function hotelRoom()
    {
        return $this->belongsTo(Room::class, 'room_id', 'id');
    }

    public function roomBookedByUser()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'id');
    }
}
