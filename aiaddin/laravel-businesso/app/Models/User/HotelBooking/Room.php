<?php

namespace App\Models\User\HotelBooking;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    use HasFactory;

    public $table = 'user_rooms';

    protected $guarded = [];

    public function roomContent()
    {
        return $this->hasMany(RoomContent::class, 'room_id', 'id');
    }
    public function roomBookings()
    {
        return $this->hasMany(RoomBooking::class, 'room_id', 'id');
    }

    public function roomReview()
    {
        return $this->hasMany('App\Models\RoomManagement\RoomReview');
    }
    /**
     * scope a query to only those rooms whose status is show.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeStatus($query)
    {
        return $query->where('status', 1);
    }
}
