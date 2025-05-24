import React from "react";
import { Link } from "react-router-dom";
import {
  HomeIcon,
  ColorSwatchIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

function Navbar() {
  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-indigo-600">
                ColorSense AI
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
              >
                <HomeIcon className="h-5 w-5 mr-1" />
                Home
              </Link>
              <Link
                to="/browser"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                <ColorSwatchIcon className="h-5 w-5 mr-1" />
                Color Browser
              </Link>
              <Link
                to="/chat"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-1" />
                Chat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
