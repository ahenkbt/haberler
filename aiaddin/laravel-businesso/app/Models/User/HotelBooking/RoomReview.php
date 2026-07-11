<?php

namespace App\Models\User\HotelBooking;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomReview extends Model
{
    use HasFactory;
    public $table = 'user_room_reviews';
    protected $guarded = [];

    public function roomReviewedByCustomer()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'id');
    }

    public function reviewOfRoom()
    {
        return $this->belongsTo(Room::class, 'room_id', 'id');
    }
}
