<?php

namespace App\Models\User\HotelBooking;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomContent extends Model
{
    use HasFactory;

    public $table = 'user_room_contents';

    protected $guarded = [];

    public function room()
    {
        return $this->belongsTo(Room::class, 'room_id', 'id');
    }

    public function roomCategory()
    {
        return $this->belongsTo(RoomCategory::class, 'room_category_id', 'id');
    }
    public function roomContentLang()
    {
        return $this->belongsTo('App\Models\Language');
    }
}
